import type { SyntaxNode } from '@lezer/common';

export function customFoldInside(node: SyntaxNode): { from: number; to: number } | null {
  if (node.name === 'Command') {
    return foldCommand(node);
  }
  return null;
}

function foldCommand(node: SyntaxNode): { from: number; to: number } | null {
  const stemNode = node.getChild('Stem');
  const argsNodes = node.getChildren('Args');
  const metadataNode = node.getChildren('Metadata');
  const modelNodes = node.getChildren('Model');

  if (stemNode == null) {
    return null;
  }

  let from = calculateStartAndEnd([stemNode]).to;
  if (argsNodes.length > 0) {
    from = calculateStartAndEnd(argsNodes).to;
  }

  // determine which node starts sooner if both exist
  if (metadataNode.length > 0 && modelNodes.length > 0) {
    const { to: to } = calculateStartAndEnd(modelNodes.concat(metadataNode));
    return { from, to };
  } else if (metadataNode) {
    const { to: to } = calculateStartAndEnd(metadataNode);
    return { from, to };
  } else if (modelNodes) {
    const { to: to } = calculateStartAndEnd(modelNodes);
    return { from, to };
  }
  return null;
}

function calculateStartAndEnd(nodes: SyntaxNode[]): { from: number; to: number } {
  return nodes.reduce(
    (acc, node) => ({
      from: Math.min(acc.from, node.from),
      to: Math.max(acc.to, node.to),
    }),
    { from: Number.MAX_VALUE, to: Number.MIN_VALUE },
  );
}
