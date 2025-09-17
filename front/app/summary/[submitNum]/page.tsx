"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function ReportPage() {
  const params = useParams();
  const submitNum = params.submitNum;

  const [summary, setSummary] = useState<string>("보고서 생성 중...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submitNum }),
        });

        const data = await res.json();
        setSummary(data.summary);
      } catch (err) {
        console.error(err);
        setSummary("보고서를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [submitNum]);

  return (
    <div style={{ padding: "2rem", fontFamily: "Malgun Gothic" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "1rem" }}>
        경영진 요약 보고서
      </h1>
      {loading ? (
        <p>보고서 생성 중...</p>
      ) : (
        <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{summary}</pre>
      )}
    </div>
  );
}
