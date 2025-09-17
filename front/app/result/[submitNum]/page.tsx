"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Download, 
  FileImage, 
  Loader2,
  TrendingUp,
  Users,
  Target
} from "lucide-react";
import Link from "next/link";
import { AnalysisResult } from "@/types/api";

import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

import { apiClient, createMockAnalysisResult } from "@/lib/api-client";

export default function ResultPage() {
  const params = useParams();
  const submitNum = params.submitNum as string;

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [existingChartData, setExistingChartData] = useState<any[] | null>(null);
  const [predictionChartData, setPredictionChartData] = useState<{ labels: any[], values: any[] } | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const { data, error } = await apiClient.getAnalysisResult(submitNum);

        if (error || !data) {
          console.warn("API 호출 실패, mock 데이터 사용:", error);
          setResult(createMockAnalysisResult(submitNum));
        } else {
          setResult(data);
        }
      } catch (err) {
        console.warn("API 호출 오류, mock 데이터 사용:", err);
        setResult(createMockAnalysisResult(submitNum));
      } finally {
        setLoading(false);
      }
    };

    if (submitNum) fetchResult();

    // JSON 기반 차트 데이터 로드
    fetch("/data/F&B_roi_groups.json")
      .then((res) => res.json())
      .then((data) => setExistingChartData(data))
      .catch(() => setExistingChartData(null));

    fetch("/data/F&B_sales_prediction.json")
      .then((res) => res.json())
      .then((data) =>
        setPredictionChartData({
          labels: data.x_values,
          values: data.y_values,
        })
      )
      .catch(() => setPredictionChartData(null));
  }, [submitNum]);

  const handleExportPDF = () => window.print();
  const handleDownloadChart = (chartType: "existing" | "prediction") =>
    console.log(`Downloading ${chartType} chart...`);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">분석 결과를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error || "결과를 찾을 수 없습니다."}</p>
            <Button asChild>
              <Link href="/result/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                대시보드로 돌아가기
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 상단 헤더 */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/result/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                대시보드로 돌아가기
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{result.productName}</h1>
              <Badge variant="secondary">#{result.submitNum}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/submit">새 분석 시작</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF 내보내기
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/summary/${submitNum}`}>
                보고서 요약하기
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* 제품 정보 */}
        <section className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <Badge variant="outline" className="text-base px-3 py-1">
                  {result.category} / {result.subCategory}
                </Badge>
                <Badge>분석 완료</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                분석 완료: {new Date(result.completedAt!).toLocaleString("ko-KR")}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 마케팅 주요 타겟 */}
        <section className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                마케팅 주요 타겟 (설문 기반, 카테고리별)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.marketingTargets.map((target) => (
                  <div key={target.rank} className="relative">
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                          {target.rank}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{target.demographic}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{target.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="text-xs font-medium text-primary">{target.percentage}%</div>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${target.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ROI 벤치마크 */}
        <section className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                ROI 벤치마크 지표
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{result.roiMetrics.top10}×</div>
                  <div className="text-sm font-medium">Top 10% 평균 ROI</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{result.roiMetrics.top50}×</div>
                  <div className="text-sm font-medium">Top 50% 평균 ROI</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">{result.roiMetrics.top80}×</div>
                  <div className="text-sm font-medium">Top 80% 평균 ROI</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 좌우 레이아웃 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 좌측: 기존 데이터 차트 (JSON 기반 Bar 차트) */}
          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-24 space-y-6">
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>기존 데이터 분석</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadChart("existing")}>
                    <FileImage className="h-4 w-4 mr-2" />
                    차트 다운로드
                  </Button>
                </CardHeader>
                <CardContent>
                  {existingChartData ? (
                    <Bar
                      data={{
                        labels: existingChartData.map((d) => d.roi_group),
                        datasets: [
                          { label: "평균 노출", data: existingChartData.map((d) => d.avg_exposure), backgroundColor: "#3b82f6" },
                          { label: "평균 관심", data: existingChartData.map((d) => d.avg_interest), backgroundColor: "#10b981" },
                          { label: "평균 방문", data: existingChartData.map((d) => d.avg_visit), backgroundColor: "#f59e0b" },
                          { label: "평균 구매", data: existingChartData.map((d) => d.avg_purchase), backgroundColor: "#ef4444" },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: "top" }, title: { display: true, text: "기존 데이터 ROI 지표" } },
                        scales: { y: { beginAtZero: true } },
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <FileImage className="h-12 w-12 mx-auto mb-2" />
                      <p>기존 데이터 차트가 여기에 표시됩니다</p>
                      <p className="text-sm mt-1">JSON: /data/F&B_roi_groups.json</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 우측: PPL 성공사례 + 예측 데이터 */}
          <div className="lg:col-span-5">
            <div className="space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {/* PPL 성공 사례 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    PPL 성공 사례
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.pplCases.map((pplCase) => (
                    <div key={pplCase.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-sm">{pplCase.title}</h4>
                        <Badge variant="outline" className="text-xs">{pplCase.performance}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{pplCase.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{pplCase.category}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 사용자 제품 예측 데이터 (JSON 기반 Line 차트) */}
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>사용자 제품 예측 분석</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadChart("prediction")}>
                    <FileImage className="h-4 w-4 mr-2" />
                    차트 다운로드
                  </Button>
                </CardHeader>
                <CardContent>
                  {predictionChartData && predictionChartData.labels && predictionChartData.values ? (
                  <Line
                    data={{
                      labels: predictionChartData.labels.map((v) => Math.round(v)), // x축 소수점 제거
                      datasets: [
                        {
                          label: "예측 매출 증가",
                          data: predictionChartData.values.map((v) => Math.round(v)), // y축 정수형
                          borderColor: "#2563eb",
                          backgroundColor: "rgba(37,99,235,0.2)",
                          fill: true,
                          tension: 0.4,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: true },
                        tooltip: { enabled: true },
                      },
                      scales: {
                        x: {
                          title: { display: true, text: "노출 시간(초)" },
                          ticks: {
                            callback: (val) => Math.round(Number(val)), // 소수점 제거
                            maxRotation: 0, // 라벨 세로 회전 최소화
                            minRotation: 0,
                          },
                        },
                        y: {
                          title: { display: true, text: "예측 매출 증가(원)" },
                          ticks: {
                            callback: (val) => Math.round(Number(val)), // y축 정수형
                          },
                        },
                      },
                    }}
                  />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                      <p>사용자 제품 예측 차트가 여기에 표시됩니다</p>
                      <p className="text-sm mt-1">JSON: /data/F&B_sales_prediction.json</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
