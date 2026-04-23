import type { Token } from "markdown-it";
import type {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import * as React from "react";
import type { Primitive } from "utility-types";
import AISummaryBlockComponent from "../components/AISummaryBlock";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import type { ComponentProps } from "../types";
import Node from "./Node";

export enum AISummaryBlockStatus {
  Loading = "loading",
  Success = "success",
  Error = "error",
}

export default class AISummaryBlock extends Node {
  get name() {
    return "ai_summary_block";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        summary: {
          default: null,
        },
        error: {
          default: null,
        },
        status: {
          default: AISummaryBlockStatus.Loading,
        },
        documentId: {
          default: null,
        },
      },
      group: "block",
      defining: true,
      draggable: true,
      atom: true,
      selectable: true,
      parseDOM: [
        {
          tag: "div.ai-summary-block",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            summary: dom.dataset.summary || null,
            error: dom.dataset.error || null,
            status: (dom.dataset.status as AISummaryBlockStatus) || AISummaryBlockStatus.Loading,
            documentId: dom.dataset.documentId || null,
          }),
        },
      ],
      toDOM: (node) => {
        return [
          "div",
          {
            class: `ai-summary-block ${node.attrs.status}`,
            "data-summary": node.attrs.summary || "",
            "data-error": node.attrs.error || "",
            "data-status": node.attrs.status,
            "data-document-id": node.attrs.documentId || "",
          },
        ];
      },
    };
  }

  component = (props: ComponentProps) => (
    <AISummaryBlockComponent
      {...props}
      onUpdate={this.handleUpdate(props)}
    />
  );

  handleUpdate =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (attrs: Record<string, Primitive>) => {
      const { view } = this.editor;
      const { tr } = view.state;

      const pos = getPos();
      const transaction = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        ...attrs,
      });
      view.dispatch(transaction);
    };

  commands({ type }: { type: NodeType }) {
    return {
      ai_summary_block: (attrs: Record<string, Primitive>) =>
        this.createBlockCommand(type, attrs),
    };
  }

  createBlockCommand = (
    type: NodeType,
    attrs: Record<string, Primitive>
  ): Command => {
    return (state, dispatch) => {
      const { tr, selection } = state;
      const { $from } = selection;

      const node = type.create(attrs);
      
      if (dispatch) {
        const transaction = tr.replaceRangeWith($from.pos, $from.pos, node);
        dispatch(transaction);
      }
      return true;
    };
  };

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("\n:::ai-summary\n");
    if (node.attrs.summary) {
      state.write(`<!-- summary: ${node.attrs.summary} -->\n`);
    }
    if (node.attrs.error) {
      state.write(`<!-- error: ${node.attrs.error} -->\n`);
    }
    state.write(`<!-- status: ${node.attrs.status} -->\n`);
    if (node.attrs.documentId) {
      state.write(`<!-- documentId: ${node.attrs.documentId} -->\n`);
    }
    state.write(":::");
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      block: "ai_summary_block",
      getAttrs: (tok: Token) => {
        const attrs: Record<string, any> = {};
        if (tok.info) {
          const info = tok.info.trim();
          const summaryMatch = info.match(/summary:\s*(.+)/);
          if (summaryMatch) {
            attrs.summary = summaryMatch[1].trim();
            attrs.status = AISummaryBlockStatus.Success;
          }
        }
        return attrs;
      },
    };
  }
}
