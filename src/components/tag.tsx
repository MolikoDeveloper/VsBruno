import { useCallback } from "react"

export const Tag = ({ title, active, id, onClick }: {
    title: string, active?: boolean, id?: string,
    onClick?: ({ event, props }: { event: React.MouseEvent<HTMLDivElement, MouseEvent>, props: any }) => void,
}) => {
    const onclick = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!onClick) return;

        onClick?.({
            event: event, props: {
                active: active
            }
        });

    }, [onClick])

    return <>
        <div key="a" onClick={onclick} id={id} className={`w-fit px-[5px] py-[3px] text-[15px] cursor-pointer ${active ? "font-bold border-b-[4px] border-b-[#569cd6] text-[#bbbbbb]" : "text-[#686868]"}`}>
            {title}
        </div>
    </>
}