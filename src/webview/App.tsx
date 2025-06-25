import BottomBar from "src/webview/components/BottomBar";
import { Panel } from "src/webview/components/Panel/Panel";
import { PanelGroup } from "src/webview/components/Panel/PanelGroup";
import RequestPanel from "src/webview/components/RequestPanels/RequestPanel";
import TopBar from "src/webview/components/TopBar";
import { useBruContent } from "./context/BruProvider";
import { useEffect, useState } from "react";
import type { SerializedResponse, WorkSpaceScripts } from "src/types/shared";
import { vscode } from "src/common/vscodeapi";
import ResponsePanel from "src/webview/components/ResponsePanels/ResponsePanel";
import type { BruFile, BruCollection, BruHeaders } from "src/types/bruno/bruno";
import type { BrunoConfig } from "src/types/bruno/bruno.config";
import { useEditorConfig } from "./context/EditorProvider";
import { useWorkspaceScripts } from "./context/scriptsProvider";
import { useVSC } from "./common/hooks/useVSC";

export default function () {
  const {
    bruContent,
    setBruContent,
    setScriptedBruContent,
    setBruCollection,
    setBruConfig,
    setBruResponse,
    scriptedBruContent,
  } = useBruContent();
  const { setScripts } = useWorkspaceScripts();
  const [scriptStatus, SetScriptStatus] = useState<
    "starting" | "running" | "stopping" | "stopped"
  >("stopped");
  const { setThemeKind } = useEditorConfig();
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    vscode.postMessage({ type: "init" });
  }, []);

  useVSC("open", (data) => {
    setBruContent(data);
    setScriptedBruContent(data);
  });
  useVSC("update", (data) => {
    setFirstLoad(true);
    setBruContent(data);
  });
  useVSC("fetch", setBruResponse);
  useVSC("collection", setBruCollection);
  useVSC("bruno-config", setBruConfig);
  useVSC("bru-event", (_) => {});
  useVSC("script-result", ({ isPre, exports }) => {
    if (!isPre) return;
    const { headers, body } = exports.req;
    setScriptedBruContent((prev) => {
      const next = { ...prev };
      if (headers) next.headers = headers;
      if (body) next.body = { ...next.body, json: JSON.stringify(body) };
      return next;
    });
  });
  useVSC("script-state", SetScriptStatus);
  useVSC("theme", setThemeKind);
  useVSC("vscode-theme-data", (_) => {});
  useVSC("bruno-scripts", setScripts);

  // on every webview change
  useEffect(() => {
    if (!bruContent) {
      return;
    }

    if (__filename.replace(".bru", "") !== bruContent.meta?.name) {
      setBruContent((prev) => ({
        ...prev,
        meta: {
          ...prev?.meta!,
          name: __filename.replace(".bru", ""),
        },
      }));
    }

    if (firstLoad) {
      setFirstLoad(false);
      return;
    }

    vscode.postMessage({
      type: "edit",
      data: bruContent,
    });
  }, [bruContent, __filename]);

  return (
    <div className="m-0 p-0 relative h-screen w-screen flex flex-col">
      <div className="m-0 p-0 relative h-full w-full flex flex-col px-4">
        <TopBar />
        <div className="h-full">
          <PanelGroup direction="horizontal" className="h-full w-full">
            <Panel className="min-w-[350px] h-full relative">
              <RequestPanel className="px-4 h-full w-full flex flex-col" />
            </Panel>
            <Panel className="min-w-[350px] h-full relative">
              <ResponsePanel className="px-4 h-full w-full flex flex-col" />
            </Panel>
          </PanelGroup>
        </div>
      </div>
      <BottomBar></BottomBar>
    </div>
  );
}
