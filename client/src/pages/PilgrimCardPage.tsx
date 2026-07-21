import React, { useEffect, useRef, useState } from "react";
import { Church, CircleAlert, Languages, Salad, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../api.js";
import { isPilgrimCardLanguage, pilgrimCardLabels, pilgrimLanguageOptions, type PilgrimCardLanguage, type PublicPilgrimCard } from "../utils/pilgrimCardI18n.js";

function CardBarcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    let active = true;
    import("jsbarcode").then(({ default: JsBarcode }) => {
      if (active && ref.current) JsBarcode(ref.current, value, { format: "CODE128", width: 1.2, height: 72, displayValue: false, margin: 8 });
    });
    return () => { active = false; };
  }, [value]);
  return <svg ref={ref} aria-label="Pilgrim card barcode" />;
}

export function PilgrimCardPage({ token }: { token: string }) {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang") ?? "";
  const [language, setLanguage] = useState<PilgrimCardLanguage | null>(isPilgrimCardLanguage(queryLanguage) ? queryLanguage : null);
  const [pilgrim, setPilgrim] = useState<PublicPilgrimCard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api<{ pilgrim: PublicPilgrimCard }>("/api/pilgrims/card", { method: "POST", body: JSON.stringify({ token, language }) })
      .then((data) => { setPilgrim(data.pilgrim); if (!language) setLanguage(data.pilgrim.language); document.documentElement.lang = data.pilgrim.language; })
      .catch((requestError) => setError((language ?? "en") === "ko" ? (requestError as Error).message : pilgrimCardLabels[language ?? "en"].cardUnavailable));
  }, [token, language]);

  const activeLanguage = language ?? "en";
  const labels = pilgrimCardLabels[activeLanguage];
  return (
    <main className="pilgrim-self-page">
      <header className="pilgrim-self-header"><Church /><div><span>WYD SEOUL 2027 · SEGOK PARISH</span><h1>{labels.card}</h1></div><label><Languages /><select value={activeLanguage} onChange={(event) => setLanguage(event.target.value as PilgrimCardLanguage)}>{pilgrimLanguageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></header>
      {error ? <section className="pilgrim-card-error"><CircleAlert /><h2>{error}</h2></section> : !pilgrim ? <section className="pilgrim-card-loading">{labels.loading}</section> : (
        <article className="pilgrim-self-card">
          <section className="pilgrim-card-identity"><div><span>{pilgrim.pilgrimNo}</span><h2>{pilgrim.name}</h2><p>{pilgrim.baptismalName || labels.none}</p></div><UserRound /></section>
          <section className="pilgrim-card-barcode"><CardBarcode value={token} /><strong>{pilgrim.pilgrimNo}</strong><p>{labels.scanHelp}</p></section>
          <section className="pilgrim-card-details"><h3><ShieldCheck /> {labels.identity}</h3><dl><div><dt>{labels.name}</dt><dd>{pilgrim.name}</dd></div><div><dt>{labels.baptismalName}</dt><dd>{pilgrim.baptismalName || labels.none}</dd></div><div><dt>{labels.diocese}</dt><dd>{pilgrim.diocese}</dd></div><div><dt>{labels.region}</dt><dd>{pilgrim.region}</dd></div><div><dt>{labels.grade}</dt><dd>{pilgrim.grade}</dd></div><div><dt>{labels.age}</dt><dd>{pilgrim.age} {labels.years}</dd></div></dl></section>
          <section className="pilgrim-diet-card"><h3><Salad /> {labels.diet}: {pilgrim.dietGuide.label}</h3><div className="diet-guide-grid"><div className="can-eat"><span>{labels.canEat}</span><p>{pilgrim.dietGuide.canEat}</p></div><div className="must-avoid"><span>{labels.avoid}</span><p>{pilgrim.dietGuide.avoid}</p></div><div><span>{labels.koreanFood}</span><p>{pilgrim.dietGuide.koreanFood}</p></div><div><span>{labels.dietNotes}</span><p>{pilgrim.dietNotes || labels.none}</p></div><div><span>{labels.allergies}</span><p>{pilgrim.allergies || labels.none}</p></div></div></section>
        </article>
      )}
    </main>
  );
}
