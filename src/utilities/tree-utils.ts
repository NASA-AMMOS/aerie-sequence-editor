import type { SyntaxNode } from '@lezer/common';

export function numberOfChildren(node: SyntaxNode): number {
  let count = 0;
  let child = node.firstChild;
  while (child) {
    count++;
    child = child.nextSibling;
  }
  return count;
}

export function getChildrenNode(node: SyntaxNode): SyntaxNode[] {
  const children = [];
  let child = node.firstChild;
  while (child) {
    children.push(child);
    child = child.nextSibling;
  }
  return children;
}

export function getDeepestNode(node: SyntaxNode): SyntaxNode {
  let currentNode = node;
  while (currentNode.firstChild) {
    currentNode = currentNode.firstChild;
  }
  while (currentNode.nextSibling) {
    currentNode = currentNode.nextSibling;
  }
  return currentNode;
}