"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./page.module.css";

type DashboardResponse = {
  propertyId?: string;
  request?: {
    startDate?: string;
    endDate?: string;
    creatorId?: string;
    productId?: string | null;
    eventName?: string;
  };
  summary?: {
    sessions?: string;
    transactions?: string;
    averageSessionDuration?: string;
    bounceRate?: string;
  };
  trafficSources?: Array<{
    sessionSource?: string;
    sessions?: string;
    sharePercent?: number;
  }>;
  dailyMetrics?: Array<{
    date?: string;
    sessions?: string;
    transactions?: string;
    averageSessionDuration?: string;
    bounceRate?: string;
  }>;
  dailySourceBreakdown?: Array<{
    date?: string;
    sessionSource?: string;
    sessions?: string;
  }>;
  error?: string;
};

const defaultCreatorId = "1776611160010x226433522091950080";
const defaultProductId = "1776611160010x226433522091950080";
const defaultStartDate = "2026-02-10";
const defaultEndDate = "2026-03-09";

function formatNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const raw = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(raw)) return String(value);
  return new Intl.NumberFormat("ko-KR").format(raw);
}

function formatDuration(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const raw = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(raw)) return String(value);
  if (raw === 0) return "0초";

  const minutes = Math.floor(raw / 60);
  const seconds = Math.round(raw % 60);
  if (minutes === 0) return `${seconds}초`;
  return `${minutes}분 ${seconds}초`;
}

function formatRate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const raw = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(raw)) return String(value);
  return `${(raw * 100).toFixed(1)}%`;
}

export default function Home() {
  const [creatorId, setCreatorId] = useState(defaultCreatorId);
  const [productId, setProductId] = useState(defaultProductId);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [includeProduct, setIncludeProduct] = useState(true);
  const [apiToken, setApiToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DashboardResponse | null>(null);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      creator_id: creatorId.trim(),
      start_date: startDate,
      end_date: endDate,
    });

    if (includeProduct && productId.trim()) {
      params.set("product_id", productId.trim());
    }

    return `/api/ga4/dashboard?${params.toString()}`;
  }, [creatorId, endDate, includeProduct, productId, startDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const headers = new Headers();
      if (apiToken.trim()) {
        headers.set("X-API-KEY", apiToken.trim());
      }

      const response = await fetch(requestUrl, { headers });
      const data = (await response.json()) as DashboardResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "조회에 실패했습니다.");
      }

      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.kicker}>ZeroFee GA4 Dashboard Tester</p>
            <h1>원하는 creator, product, 날짜를 넣고 바로 응답을 확인하세요.</h1>
            <p className={styles.description}>
              /api/ga4/dashboard 를 직접 호출해서 Bubble용 데이터를 검증하는 테스트 뷰입니다.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>Creator ID</span>
              <input value={creatorId} onChange={e => setCreatorId(e.target.value)} />
            </label>

            <label className={styles.field}>
              <span>Product ID</span>
              <div className={styles.inlineField}>
                <input
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  disabled={!includeProduct}
                  placeholder="전체 조회면 비워도 됨"
                />
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={includeProduct}
                    onChange={e => setIncludeProduct(e.target.checked)}
                  />
                  <span>{includeProduct ? "상품 포함" : "전체"}</span>
                </label>
              </div>
            </label>

            <div className={styles.dateRow}>
              <label className={styles.field}>
                <span>Start Date</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>End Date</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </label>
            </div>

            <label className={styles.field}>
              <span>API Token</span>
              <input
                type="password"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                placeholder="ZEROFEE_API_TOKEN"
                autoComplete="off"
              />
            </label>

            <div className={styles.actions}>
              <button type="submit" disabled={loading}>
                {loading ? "조회 중..." : "조회"}
              </button>
              <code>{requestUrl}</code>
            </div>
          </form>
        </header>

        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.grid}>
          <article className={styles.card}>
            <span>방문자 수</span>
            <strong>{formatNumber(result?.summary?.sessions)}</strong>
          </article>
          <article className={styles.card}>
            <span>구매자 수</span>
            <strong>{formatNumber(result?.summary?.transactions)}</strong>
          </article>
          <article className={styles.card}>
            <span>평균 체류 시간</span>
            <strong>{formatDuration(result?.summary?.averageSessionDuration)}</strong>
          </article>
          <article className={styles.card}>
            <span>페이지 이탈율</span>
            <strong>{formatRate(result?.summary?.bounceRate)}</strong>
          </article>
          <article className={styles.card}>
            <span>Property ID</span>
            <strong>{result?.propertyId ?? "-"}</strong>
          </article>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>유입 소스</h2>
            <p>raw sessionSource 기준으로 반환됩니다.</p>
          </div>

          <div className={styles.sourceList}>
            {(result?.trafficSources ?? []).length > 0 ? (
              result?.trafficSources?.map(item => (
                <div className={styles.sourceRow} key={`${item.sessionSource}-${item.sessions}`}>
                  <div>
                    <strong>{item.sessionSource ?? "-"}</strong>
                    <span>{formatNumber(item.sessions)}명</span>
                  </div>
                  <div className={styles.sourceMetric}>
                    <span>{formatRate(item.sharePercent)}</span>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${item.sharePercent ?? 0}%` }} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.empty}>조회 결과가 없으면 여기에 소스 목록이 표시됩니다.</p>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>일별 방문자 추이</h2>
            <p>누락된 날짜는 0으로 채워집니다.</p>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>방문자 수</th>
                  <th>구매자 수</th>
                  <th>평균 체류 시간</th>
                  <th>페이지 이탈율</th>
                </tr>
              </thead>
              <tbody>
                {(result?.dailyMetrics ?? []).length > 0 ? (
                  result?.dailyMetrics?.map(row => (
                    <tr key={row.date}>
                      <td>{row.date ?? "-"}</td>
                      <td>{formatNumber(row.sessions)}</td>
                      <td>{formatNumber(row.transactions)}</td>
                      <td>{formatDuration(row.averageSessionDuration)}</td>
                      <td>{formatRate(row.bounceRate)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={styles.emptyCell}>
                      조회 결과가 없으면 여기에 일별 데이터가 표시됩니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>원본 응답</h2>
            <p>개발자가 바로 붙여 넣어 확인할 수 있도록 JSON도 같이 보여줍니다.</p>
          </div>

          <pre className={styles.jsonBlock}>{JSON.stringify(result ?? {}, null, 2)}</pre>
        </section>
      </section>
    </main>
  );
}
