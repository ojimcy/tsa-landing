import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GetTheApp, PayLoading, PayNotice, PayShell } from "@/components/pay/pay-shell";
import {
  fetchPublicProduct,
  formatUsd,
  isProductId,
  PRODUCT_GONE,
  PRODUCT_LOAD_ERROR,
  productAppUrl,
  type PublicProduct,
} from "@/lib/product";
import { PayApiError } from "@/lib/pay";

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "gone" } | { kind: "ok"; product: PublicProduct };

/** A shared marketplace listing (/p/:id): what it is, then a hand-off to the app. */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const valid = !!id && isProductId(id);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!valid || !id) return;
    let cancelled = false;
    fetchPublicProduct(id).then(
      (product) => !cancelled && setState({ kind: "ok", product }),
      (err) => {
        if (cancelled) return;
        if (err instanceof PayApiError && err.status === 404) setState({ kind: "gone" });
        else setState({ kind: "error", message: err instanceof Error ? err.message : PRODUCT_LOAD_ERROR });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [valid, id, retryKey]);

  const title = state.kind === "ok" ? state.product.name : "Product";

  return (
    <PayShell title={title}>
      {!valid || state.kind === "gone" ? (
        <PayNotice message={PRODUCT_GONE} />
      ) : state.kind === "loading" ? (
        <PayLoading label="Loading…" />
      ) : state.kind === "error" ? (
        <PayNotice
          message={state.message}
          onRetry={() => {
            setState({ kind: "loading" });
            setRetryKey((k) => k + 1);
          }}
        />
      ) : (
        <ProductView product={state.product} />
      )}
    </PayShell>
  );
}

export function ProductView({ product }: { product: PublicProduct }) {
  const cover = product.images?.find((i) => i.url)?.url;
  const digital = product.kind === "digital";
  const by = digital ? product.digital?.creatorName : product.companyName;
  const openApp = () => {
    window.location.href = productAppUrl(product.id);
  };

  return (
    <>
      {cover ? (
        <img
          src={cover}
          alt=""
          className="mx-auto aspect-square w-48 rounded-2xl object-cover shadow-sm"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-brand">
        {[digital ? "Digital product" : null, product.categoryName].filter(Boolean).join(" · ")}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 wrap-anywhere">{product.name}</h1>
      {by ? <p className="mt-1 text-sm text-slate-500">by {by}</p> : null}
      <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{formatUsd(product.price)}</p>
      {digital ? (
        <p className="mt-2 text-sm text-slate-500">
          {product.digital?.preview ? "Free preview in the app. " : ""}
          {product.digital?.licence === "commercial" ? "Commercial-use licence." : "Personal-use licence."}
        </p>
      ) : null}
      <Button size="lg" className="mt-6 w-full" onClick={openApp}>
        Open in TSA Connect
      </Button>
      <GetTheApp />
    </>
  );
}
