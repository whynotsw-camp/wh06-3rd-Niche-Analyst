import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

// 서버 사이드에서만 OpenAI API 키 사용 (환경변수 필요)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { submitNum } = await req.json();

    // JSON 데이터 읽기
    const dataPath = path.join(process.cwd(), "public", "data", "F&B_sales_prediction.json");
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const reportData = JSON.parse(rawData);

    // 평균 ROI 계산 (예시로 avg_roi 필드가 이미 있다면 그대로 사용 가능)
    const avgRoi = reportData.avg_roi || 103.25;

    // 보고서 요약용 텍스트 생성
    const summaryInput = `
산업군: ${reportData.industry}
데이터 수: ${reportData.x_values.length}
총 노출 시간 최소: ${reportData.x_values[0].toFixed(1)}초
총 노출 시간 최대: ${reportData.x_values[reportData.x_values.length - 1].toFixed(1)}초
예측 매출 증가 최소: ${Math.min(...reportData.y_values).toLocaleString()}원
예측 매출 증가 최대: ${Math.max(...reportData.y_values).toLocaleString()}원
평균 ROI: ${avgRoi.toFixed(2)}%
그래프 제목: ${reportData.graph_title}
`;

    // OpenAI 호출
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "너는 F&B 산업 경영진용 보고서를 전문적으로 요약하는 분석 어시스턴트야."
        },
        {
          role: "user",
          content: `아래 데이터를 바탕으로 전문적이고 간결한 경영진용 요약 보고서를 작성해줘:\n${summaryInput}`
        },
      ],
      max_tokens: 500,
    });

    const summary = response.choices[0].message.content;

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Summary API error:", err);
    return NextResponse.json(
      { summary: "요약 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
