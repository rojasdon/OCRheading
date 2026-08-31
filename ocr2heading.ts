/** Mirrors the native flow: recognize -> replace -> dismiss -> re-lasso -> heading. */
import {PluginCommAPI, PluginNoteAPI, PluginManager} from 'sn-plugin-lib';

export type ConversionResult = {success: boolean; message?: string};
export type ProgressReporter = (step: string) => void;
const TITLE_STYLE = 1;
const OCR_FONT_SIZE = 96;
const STEP_TIMEOUT_MS = 20_000;

async function ensurePermission(permission: string, desc: string): Promise<boolean> {
  const status = await PluginManager.hasPermission(permission);
  if (status === 1 || status === 2) return true;
  const result = await PluginManager.requestPermission(permission, desc);
  return result === 1 || result === 2;
}

function withTimeout<T>(label: string, promise: Promise<T>, ms = STEP_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out while running ${label}.`)), ms),
    ),
  ]);
}

function errorMessage(response: any, fallback: string): string {
  return response?.error?.message || fallback;
}

export async function convertHandwritingToHeading(report: ProgressReporter = () => {}): Promise<ConversionResult> {
  try {
    report('Checking permissions…');
    const readOk = await withTimeout('file-read permission check', ensurePermission(
      'plugin.permission.FILE:READ', 'Read the selected handwriting for OCR.',
    ));
    if (!readOk) return {success: false, message: 'File-read permission was not granted.'};

    const writeOk = await withTimeout('file-write permission check', ensurePermission(
      'plugin.permission.FILE:WRITE', 'Create a heading and insert its OCR text.',
    ));
    if (!writeOk) return {success: false, message: 'File-write permission was not granted.'};

    report('Reading selected handwriting…');
    const lassoRes: any = await withTimeout('reading the lasso', PluginCommAPI.getLassoElements());
    if (!lassoRes?.success || !Array.isArray(lassoRes.result) || lassoRes.result.length === 0) {
      return {success: false, message: errorMessage(lassoRes, 'Select handwriting with the lasso first.')};
    }
    const elements = lassoRes.result;
    if (elements.some((element: any) => element?.type !== 0)) {
      return {success: false, message: 'The selection must contain handwriting strokes only.'};
    }

    report('Reading selection bounds…');
    const [sizeRes, rectRes]: any[] = await Promise.all([
      withTimeout('reading the page size', PluginCommAPI.getPageDisplaySize()),
      withTimeout('reading the lasso bounds', PluginCommAPI.getLassoRect()),
    ]);
    if (!sizeRes?.success || !sizeRes.result) {
      return {success: false, message: errorMessage(sizeRes, 'Could not read the page size.')};
    }
    if (!rectRes?.success || !rectRes.result) {
      return {success: false, message: errorMessage(rectRes, 'Could not read the lasso bounds.')};
    }

    report('Recognizing handwriting…');
    const recogRes: any = await withTimeout(
      'handwriting recognition', PluginCommAPI.recognizeElements(elements, sizeRes.result),
    );
    const recognizedText = typeof recogRes?.result === 'string'
      ? recogRes.result.replace(/\s+/g, ' ').trim()
      : '';
    if (!recogRes?.success || !recognizedText) {
      return {success: false, message: errorMessage(recogRes, 'No text was recognized.')};
    }

    const rect = rectRes.result;
    // Keep the original lasso alive until deletion. saveCurrentNote() clears
    // that selection on Chauvet 3.29.43_beta and must not run before this call.
    report('Replacing handwriting…');
    const deleteRes: any = await withTimeout(
      'removing the lassoed handwriting', PluginCommAPI.deleteLassoElements(),
    );
    if (!deleteRes?.success || deleteRes.result === false) {
      return {success: false, message: errorMessage(deleteRes, 'Could not replace the handwriting.')};
    }

    const pageWidth = sizeRes.result.width;
    const pageHeight = sizeRes.result.height;
    // Approximate the rendered bold-text bounds instead of scaling the old
    // handwriting rectangle. The native heading background follows textRect.
    const horizontalPadding = 24;
    const verticalPadding = 16;
    const averageGlyphWidth = OCR_FONT_SIZE * 0.58;
    const noWrapSafetyMargin = OCR_FONT_SIZE * 1.5;
    const desiredWidth = Math.min(
      Math.max(
        recognizedText.length * averageGlyphWidth + horizontalPadding + noWrapSafetyMargin,
        OCR_FONT_SIZE * 3,
      ),
      pageWidth - 16,
    );
    const desiredHeight = Math.min(
      OCR_FONT_SIZE * 1.25 + verticalPadding,
      pageHeight - 16,
    );
    const textLeft = Math.min(Math.max(8, rect.left), pageWidth - desiredWidth - 8);
    const textTop = Math.min(Math.max(8, rect.top), pageHeight - desiredHeight - 8);
    const textRect = {
      left: Math.round(textLeft),
      top: Math.round(textTop),
      right: Math.round(textLeft + desiredWidth),
      bottom: Math.round(textTop + desiredHeight),
    };
    report('Inserting recognized text…');
    const insertRes: any = await withTimeout('inserting the OCR text', PluginNoteAPI.insertText({
      textContentFull: recognizedText,
      textRect,
      fontSize: OCR_FONT_SIZE,
      textBold: 1,
      textAlign: 0,
      textFrameWidthType: 1,
    }));
    if (!insertRes?.success || insertRes.result === false) {
      return {success: false, message: `Handwriting was removed, but OCR text insertion failed: ${errorMessage(insertRes, 'unknown error')}`};
    }

    report('Selecting recognized text…');
    const lassoTextRes: any = await withTimeout(
      'selecting the OCR text', PluginCommAPI.lassoElements(textRect),
    );
    if (!lassoTextRes?.success || lassoTextRes.result === false) {
      return {success: false, message: errorMessage(lassoTextRes, 'OCR text was inserted but could not be selected.')};
    }

    // Verify that the programmatic lasso found a text box before promoting it.
    report('Verifying text selection…');
    const selectedTextRes: any = await withTimeout(
      'verifying the OCR text selection', PluginNoteAPI.getLassoText(),
    );
    if (!selectedTextRes?.success || !Array.isArray(selectedTextRes.result) || selectedTextRes.result.length === 0) {
      return {success: false, message: errorMessage(selectedTextRes, 'The new text box was not selected.')};
    }

    report('Promoting text to heading…');
    const titleRes: any = await withTimeout(
      'promoting the OCR text to a heading', PluginNoteAPI.setLassoTitle({style: TITLE_STYLE}),
    );
    if (!titleRes?.success || titleRes.result === false) {
      return {success: false, message: errorMessage(titleRes, 'The OCR text could not be promoted to a heading.')};
    }

    report('Saving completed heading…');
    const saveRes: any = await withTimeout('saving the note', PluginNoteAPI.saveCurrentNote());
    if (!saveRes?.success || saveRes.result === false) {
      return {success: false, message: errorMessage(saveRes, 'Changes were made, but the note could not be saved.')};
    }
    report('Complete');
    return {success: true, message: recognizedText};
  } catch (err: any) {
    return {success: false, message: err?.message ?? String(err)};
  }
}
