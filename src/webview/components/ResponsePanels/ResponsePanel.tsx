import { useEffect, useState, type JSX } from "react";
import Response_ResponsePanel from "./Response_ResponsePanel";
import Headers_ResponsePanel from "./Headers_ResponsePanel";
import Timeline_ResponsePanel from "./Timeline_ResponsePanel";
import Eraser from "../icons/Eraser";
import { useBruContent } from "src/webview/context/BruProvider";
import { useTimelineContext } from "src/webview/context/TimeLineProvider";
import Switch from "../input/Switch";
import { PanelGroup } from "../Panel/PanelGroup";
import { Panel } from "../Panel/Panel";

interface Props {
  className?: string;
}

const tabs = ["Response", "Headers", "Timeline", "Tests"];

export default function ({ className }: Props) {
  const [currentTab, setCurrentTab] = useState<string>("Response");
  const { bruResponse, setBruResponse } = useBruContent();
  const { setEvents } = useTimelineContext();
  const [toggleView, setToggleView] = useState(false);

  const activeStyle =
    "!border-b-[2px] border-b-[#569cd6] text-[var(--vscode-tab-activeForeground)]";
  const inactiveStyle = "text-[var(--vscode-tab-inactiveForeground)]";

  const mainPanels: Record<string, JSX.Element> = {
    Response: <Response_ResponsePanel />,
    Headers: <Headers_ResponsePanel />,
    Timeline: <Timeline_ResponsePanel />,
  };

  useEffect(()=> {
    if(!toggleView) return;
    if(currentTab === "Tests")
        setCurrentTab("Response")
  }, [currentTab, toggleView])

  return (
    <div className={className}>
      <section className="flex flex-wrap items-center" role="tablist">
        {tabs
          .filter((t) => (toggleView ? t !== "Tests" : true))
          .map((t, key) => (
            <div
              key={key}
              className={`select-none px-0 py-[6px] cursor-pointer mr-5 ${
                currentTab === t ? activeStyle : inactiveStyle
              }`}
              onClick={() => setCurrentTab(t)}
            >
              {t}
            </div>
          ))}

        <Switch
          value={toggleView}
          onChange={setToggleView}
          size="sm"
          className="ml-auto"
        />

        {bruResponse && (
          <div className="flex flex-grow items-center justify-end gap-3 font-bold">
            <button
              className="cursor-pointer hover:text-red-500"
              onClick={() => {
                setBruResponse(null);
                setEvents([]);
              }}
            >
              <Eraser />
            </button>
            <div className={bruResponse.ok ? "text-green-600" : "text-red-600"}>
              {bruResponse.status} {bruResponse.ok ? "ok" : "Error"}
            </div>
            <p>{bruResponse.time}</p>
            <p>{bruResponse.size}</p>
          </div>
        )}
      </section>

      {toggleView ? (
        // ─────── Split View: Main arriba + Tests abajo ───────
        <>
          <PanelGroup direction="vertical">
            <Panel>
              <section className=" h-full mb-4">
                {mainPanels[currentTab] ?? null}
              </section>
            </Panel>
            <Panel>
              <section className="overflow-auto">
                {currentTab === "Tests" && <>WIPA</>}
              </section>
            </Panel>
          </PanelGroup>
        </>
      ) : (
        // ─────── Single View: se muestra sólo la pestaña activa ───────
        <section className="w-full h-full">
          {
            {
              ...mainPanels,
              Tests: <>WIP</>,
            }[currentTab]
          }
        </section>
      )}
    </div>
  );
}
