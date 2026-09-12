import { useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';

type DocumentKind = 'invoices' | 'proposals';

/**
 * Opens a document's printable page in a new tab.
 *
 * The endpoint is behind the JWT guard, so the URL cannot simply be handed to
 * window.open — the browser would send no Authorization header and get a 401.
 * The page is fetched through the API client instead and written into a tab.
 *
 * That tab is opened synchronously on the click, before the request starts:
 * popup blockers reject a window opened later from an async callback.
 */
export function useDocumentPrint() {
  const [printingId, setPrintingId] = useState<string | null>(null);

  const print = async (kind: DocumentKind, id: string) => {
    const tab = window.open('', '_blank');

    if (!tab) {
      toast.error('Allow pop-ups for this site to print documents.');
      return;
    }

    tab.document.write(
      '<!doctype html><title>Preparing…</title>' +
        '<body style="font:14px system-ui;padding:2rem;color:#555">Preparing document…</body>',
    );

    setPrintingId(id);

    try {
      const { data } = await api.get<string>(`/${kind}/${id}/print`, {
        // The endpoint returns HTML; without this the client would try to unwrap
        // it as the usual JSON envelope.
        responseType: 'text',
        transformResponse: [(raw) => raw],
      });

      tab.document.open();
      tab.document.write(data);
      tab.document.close();
    } catch (error: any) {
      const message =
        error?.response?.status === 404
          ? 'No active template for this document type. Create one under Settings › Print Templates.'
          : (error?.response?.data?.message ?? 'Failed to generate the document.');

      tab.document.open();
      tab.document.write(
        `<!doctype html><title>Print failed</title>` +
          `<body style="font:14px system-ui;padding:2rem;color:#b91c1c">${message}</body>`,
      );
      tab.document.close();
    } finally {
      setPrintingId(null);
    }
  };

  return { print, printingId };
}
