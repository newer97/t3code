import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { createRef } from "react";
import { expect, it } from "vite-plus/test";
import { act, render } from "../../test/render";
import { serializeEditorDoc } from "~/composer-rich-text-doc";
import { ComposerPromptEditor, type ComposerPromptEditorHandle } from "./ComposerPromptEditor";

async function mountEditor(value: string) {
  await using stack = new AsyncDisposableStack();
  const screen = stack.use(
    await render(
      <ComposerPromptEditor
        editorRef={createRef<ComposerPromptEditorHandle>()}
        value={value}
        cursor={0}
        richTextEnabled={true}
        contextRecords={new Map()}
        skills={[]}
        disabled={false}
        placeholder=""
        onChange={() => {}}
        onPaste={() => {}}
      />,
    ),
  );
  const element = screen.container.querySelector<HTMLElement & { editor: Editor }>(".tiptap");
  if (!element) throw new Error("Composer did not mount");
  const environment = stack.move();
  return { editor: element.editor, [Symbol.asyncDispose]: () => environment.disposeAsync() };
}

function press(editor: Editor, key: string) {
  const event = new KeyboardEvent("keydown", { key, cancelable: true });
  const handled = editor.view.props.handleKeyDown?.(editor.view, event);
  expect(event.defaultPrevented).toBe(Boolean(handled));
  return handled;
}

it.each([
  ["ArrowRight", "ArrowUp"],
  ["ArrowUp", "ArrowRight"],
])("keeps %s at the opening RTL marker and %s at the same stop", async (first, second) => {
  await using screen = await mountEditor("**مرحبا**");
  const { editor } = screen;
  await act(async () => {
    expect(press(editor, first)).toBe(true);
    expect(press(editor, second)).toBe(false);
    editor.commands.insertContent("x");
  });
  expect(serializeEditorDoc(editor.state.doc).value).toBe("x**مرحبا**");
});

it.each([
  ["ArrowLeft", "ArrowDown"],
  ["ArrowDown", "ArrowLeft"],
])("keeps %s at the closing RTL marker and %s at the same stop", async (first, second) => {
  await using screen = await mountEditor("**مرحبا**");
  const { editor } = screen;
  await act(async () => {
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.atEnd(editor.state.doc)));
    expect(press(editor, first)).toBe(true);
    expect(press(editor, second)).toBe(false);
    editor.commands.insertContent("x");
  });
  expect(serializeEditorDoc(editor.state.doc).value).toBe("**مرحبا**x");
});
