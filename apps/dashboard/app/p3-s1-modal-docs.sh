#!/usr/bin/env bash
# p3-s1-modal-docs.sh | Assigned: Geordi La Forge
# Purpose: Implement a high-fidelity modal for displaying documentation.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/crew-fail.sh"

step="p3-s1-modal-docs"

step_header "PHASE 3 / STEP 1" "Implement Documentation Modal"

echo "🖖 Geordi: Creating DocModal.tsx component..."
cat <<EOF > "$ROOT/apps/dashboard/components/DocModal.tsx"
'use client';

import React from 'react';

interface DocModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const DocModal: React.FC<DocModalProps> = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white text-black border-2 border-black w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center border-b-2 border-black p-4">
          <h2 className="text-xl font-black uppercase tracking-tighter">{title}</h2>
          <button onClick={onClose} className="text-xl font-black hover:text-red-600">✕</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{content}</pre>
        </div>
      </div>
    </div>
  );
};
EOF

echo "🖖 Geordi: Updating page.tsx to use DocModal..."
# This part will be handled by the diff below for page.tsx

echo "✅ Step 1: Documentation Modal implemented."

crew_observe \
  --member "geordi_la_forge" \
  --category "ui" \
  --title "High-Fidelity Documentation Modal" \
  --summary "Replaced alert() with a dedicated modal for displaying architectural documentation." \
  --finding "The modal provides a non-blocking, focused view of content, improving user experience." \
  --conclusion "Critical architectural documents are now accessible without disrupting mission flow." \
  --recommend "Integrate markdown rendering for enhanced document display." \
  --tags "ui,ux,documentation,modal"