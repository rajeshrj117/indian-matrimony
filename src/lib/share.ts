export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

// Copies text to the clipboard, falling back to the legacy execCommand
// approach for browsers/webviews that don't support the Clipboard API
// (e.g. non-secure contexts, older in-app browsers).
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy method below
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

// Uses the native share sheet when available, otherwise copies the link
// to the clipboard. Always resolves — never throws — so callers can
// safely show feedback based on the returned result.
export async function shareOrCopy(data: { title: string; text?: string; url: string }): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Native share failed for some other reason — fall back to copy.
    }
  }
  const copied = await copyToClipboard(data.url);
  return copied ? 'copied' : 'failed';
}
