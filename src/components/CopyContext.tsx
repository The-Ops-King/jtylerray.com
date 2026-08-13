import { createContext, useContext } from "react";
import { COPY, type Copy } from "../copy";

export const CopyContext = createContext<Copy>(COPY[0]);
export const useCopy = () => useContext(CopyContext);

/** Renders the active headline: one line per entry, with the marked phrase
 *  carrying the accent rule. Layouts only ever render <Headline /> so a copy
 *  switch reaches every composition at once. */
export function Headline() {
  const copy = useCopy();
  return (
    <>
      {copy.headline.map((line, i) => {
        const last = i === copy.headline.length - 1;
        const at = copy.mark ? line.indexOf(copy.mark) : -1;
        return (
          <span key={line}>
            {at >= 0 ? (
              <>
                {line.slice(0, at)}
                <span className="mark">{copy.mark}</span>
                {line.slice(at + (copy.mark?.length ?? 0))}
              </>
            ) : (
              line
            )}
            {!last && <br />}
          </span>
        );
      })}
    </>
  );
}
