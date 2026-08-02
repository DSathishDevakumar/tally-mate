import { useTranslation } from "react-i18next";
import { EmptyState } from "../../../src/components/EmptyState";

export default function Billing() {
  const { t } = useTranslation();
  return <EmptyState icon="receipt-outline" title={t("billing.title")} description={t("billing.description")} />;
}
