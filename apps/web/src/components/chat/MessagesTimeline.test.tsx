// @vitest-environment jsdom

import { EnvironmentId, MessageId } from "@t3tools/contracts";
import { createRef, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { LegendListRef } from "@legendapp/list/react";

vi.mock("@legendapp/list/react", () => ({
  LegendList: (props: {
    data: Array<{ id: string }>;
    keyExtractor: (item: { id: string }) => string;
    renderItem: (args: { item: { id: string } }) => ReactNode;
  }) => (
    <>
      {props.data.map((item) => (
        <div key={props.keyExtractor(item)}>{props.renderItem({ item })}</div>
      ))}
    </>
  ),
}));

function matchMedia() {
  return {
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

let MessagesTimeline: typeof import("./MessagesTimeline").MessagesTimeline;

const ElementStub = class ElementStub {};
function stubDomGlobals() {
  const classList = {
    add: () => {},
    remove: () => {},
    toggle: () => {},
    contains: () => false,
  };

  vi.stubGlobal("Element", ElementStub);
  vi.stubGlobal("getComputedStyle", undefined);
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  });
  vi.stubGlobal("window", {
    Element: ElementStub,
    localStorage: globalThis.localStorage,
    matchMedia,
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    },
    cancelAnimationFrame: () => {},
    desktopBridge: undefined,
  });
  vi.stubGlobal("document", {
    documentElement: {
      classList,
      offsetHeight: 0,
    },
  });
}

beforeEach(stubDomGlobals);
// Cold transformation of the full chat dependency graph needs extra time on slower CI workers.
beforeAll(async () => {
  Object.defineProperty(window, "matchMedia", { value: matchMedia, configurable: true });
  ({ MessagesTimeline } = await import("./MessagesTimeline"));
}, 120_000);

const ACTIVE_THREAD_ENVIRONMENT_ID = EnvironmentId.make("environment-local");
const MESSAGE_CREATED_AT = "2026-03-17T19:12:28.000Z";

function buildProps() {
  return {
    isWorking: false,
    activeTurnInProgress: false,
    listRef: createRef<LegendListRef | null>(),
    latestRun: null,
    turnDiffSummaries: [],
    providerStatuses: [],
    runs: [],
    routeThreadKey: "environment-local:thread-1",
    onOpenTurnDiff: () => {},
    onOpenThread: () => {},
    onForkFromRun: async () => {},
    onRollbackCheckpoint: () => {},
    supportsConversationRollback: false,
    onRevertToTurnCount: () => {},
    isRevertingCheckpoint: false,
    openingVideoAttachmentId: null,
    onImageExpand: () => {},
    activeThreadEnvironmentId: ACTIVE_THREAD_ENVIRONMENT_ID,
    markdownCwd: undefined,
    resolvedTheme: "light" as const,
    timestampFormat: "locale" as const,
    workspaceRoot: undefined,
    anchorMessageId: null,
    onAnchorReady: () => {},
    onAnchorSizeChanged: () => {},
    contentInsetEndAdjustment: 0,
    liveFollowEnabled: true,
    onIsAtEndChange: () => {},
    onManualNavigation: () => {},
  };
}

function buildUserTimelineEntry(text: string) {
  return {
    id: "entry-1",
    kind: "message" as const,
    createdAt: MESSAGE_CREATED_AT,
    message: {
      id: MessageId.make("message-1"),
      role: "user" as const,
      text,
      runId: null,
      createdAt: MESSAGE_CREATED_AT,
      updatedAt: MESSAGE_CREATED_AT,
      streaming: false,
    },
  };
}

function buildAssistantTimelineEntry(text: string) {
  const entry = buildUserTimelineEntry(text);
  return {
    ...entry,
    message: {
      ...entry.message,
      role: "assistant" as const,
    },
  };
}

describe("MessagesTimeline RTL", () => {
  it("resolves user and assistant message direction from each message", () => {
    const markup = renderToStaticMarkup(
      <MessagesTimeline
        {...buildProps()}
        timelineEntries={[
          buildUserTimelineEntry("English user message."),
          buildUserTimelineEntry("הודעת משתמש בעברית."),
          buildAssistantTimelineEntry("English assistant message."),
          buildAssistantTimelineEntry("תשובת עוזר בעברית."),
        ]}
      />,
    );

    expect(markup.match(/class="chat-markdown[^"]*" dir="auto"/g)).toHaveLength(4);
  });

  it("keeps code left-to-right inside auto-directed messages", () => {
    const markup = renderToStaticMarkup(
      <MessagesTimeline
        {...buildProps()}
        markdownCwd="/workspace"
        timelineEntries={[
          buildAssistantTimelineEntry(
            ["בדוק את `src/index.ts` והריץ `vp test` ואז:", "", "```sh", "vp test run", "```"].join(
              "\n",
            ),
          ),
        ]}
      />,
    );

    expect(markup).toMatch(
      /<a(?=[^>]*class="[^"]*chat-markdown-file-link)(?=[^>]*dir="ltr")[^>]*>/,
    );
    expect(markup).toMatch(/<code[^>]*dir="ltr"[^>]*>vp test<\/code>/);
    expect(markup).toMatch(/class="chat-markdown-codeblock[^"]*"[^>]*dir="ltr"/);
  });

  it("orders table columns by the table's dominant script", () => {
    const renderTable = (rows: string[]) =>
      renderToStaticMarkup(
        <MessagesTimeline
          {...buildProps()}
          timelineEntries={[buildAssistantTimelineEntry(rows.join("\n"))]}
        />,
      );

    const arabic = renderTable([
      "| | WSL Containers الجديد |",
      "| --- | --- |",
      "| وش تشغل؟ | حاويات من صور جاهزة، مثل `nginx` و Redis |",
    ]);
    const english = renderTable(["| Name | Description |", "| --- | --- |", "| test | בדיקה |"]);

    expect(arabic).toMatch(/class="chat-markdown-table-container"[^>]*dir="ltr"/);
    expect(arabic).toMatch(/<table[^>]*dir="rtl"/);
    expect(english).toMatch(/<table[^>]*dir="ltr"/);
  });

  it("uses logical spacing for GitHub alerts inside auto-directed messages", () => {
    const markup = renderToStaticMarkup(
      <MessagesTimeline
        {...buildProps()}
        timelineEntries={[buildAssistantTimelineEntry("> [!NOTE]\n> הודעת התראה בעברית.")]}
      />,
    );

    expect(markup).toMatch(/<div role="note" class="[^"]*border-s-2[^"]*ps-3/);
    expect(markup).toContain("<bdi>Note</bdi>");
    expect(markup).not.toContain("border-l-2");
  });
});
