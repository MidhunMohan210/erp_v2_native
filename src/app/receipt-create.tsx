import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { Field, PickerList, PrimaryButton, SectionCard } from "@/components/vouchers/VoucherUi";
import { useInfinitePartyListQuery } from "@/hooks/queries/partyQueries";
import { useVoucherSeriesListQuery, voucherListQueryKeys } from "@/hooks/queries/voucherQueries";
import { cashTransactionService } from "@/services/cashTransaction.service";
import { useAppSelector } from "@/store/hooks";
import { getTodayDateString } from "@/utils/voucher";

export default function ReceiptCreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const cmp_id = selectedCompany?._id ?? "";

  const [date, setDate] = useState(getTodayDateString());
  const [seriesId, setSeriesId] = useState("");
  const [partySearch, setPartySearch] = useState("");
  const [cashBankSearch, setCashBankSearch] = useState("");
  const [partyId, setPartyId] = useState("");
  const [cashBankId, setCashBankId] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const seriesQuery = useVoucherSeriesListQuery(cmp_id, "receipt", Boolean(cmp_id));
  const partiesQuery = useInfinitePartyListQuery({
    cmp_id,
    search: partySearch,
    limit: 20,
    partyType: "party",
    enabled: Boolean(cmp_id),
  });
  const cashBanksQuery = useInfinitePartyListQuery({
    cmp_id,
    search: cashBankSearch,
    limit: 20,
    enabled: Boolean(cmp_id),
  });

  const seriesList = seriesQuery.data?.series ?? [];
  const parties = useMemo(
    () => partiesQuery.data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [partiesQuery.data],
  );
  const cashBanks = useMemo(
    () =>
      (cashBanksQuery.data?.pages.flatMap((page) => page.items ?? []) ?? []).filter(
        (item) => item.partyType === "bank" || item.partyType === "cash",
      ),
    [cashBanksQuery.data],
  );

  const selectedSeries = seriesList.find((item) => item._id === seriesId);
  const selectedParty = parties.find((item) => item._id === partyId);
  const selectedCashBank = cashBanks.find((item) => item._id === cashBankId);

  const handleSave = async () => {
    if (!cmp_id) {
      toast.error("Select a company first");
      return;
    }
    if (!selectedSeries) {
      toast.error("Select a receipt series");
      return;
    }
    if (!selectedParty) {
      toast.error("Select a customer");
      return;
    }
    if (!selectedCashBank) {
      toast.error("Select a cash or bank ledger");
      return;
    }
    if ((Number(amount) || 0) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      setIsSaving(true);
      await cashTransactionService.createReceipt({
        cmp_id,
        date,
        party: selectedParty,
        cashBank: selectedCashBank,
        selectedSeries,
        amount: Number(amount),
        narration,
      });

      await queryClient.invalidateQueries({
        queryKey: voucherListQueryKeys.list(cmp_id, "receipt", date),
      });
      toast.success("Receipt created");
      router.replace({
        pathname: "/voucher-list",
        params: { voucherType: "receipt" },
      });
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "Failed to create receipt";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Create Receipt" />
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <SectionCard title="Receipt Details">
          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Field
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
          />
          <Field
            label="Narration"
            value={narration}
            onChangeText={setNarration}
            placeholder="Optional note"
          />
        </SectionCard>

        <SectionCard title="Select Series">
          {seriesList.length === 0 ? (
            <View>
              <Text className="mb-3 text-[13px] text-slate-500">
                No receipt series found yet.
              </Text>
              <PrimaryButton
                label="Create Receipt Series"
                onPress={() => router.push({
                  pathname: "/voucher-series-form",
                  params: { voucherType: "receipt" },
                })}
              />
            </View>
          ) : (
            seriesList.map((item) => (
              <View key={item._id} className="mb-3">
                <PrimaryButton
                  label={`${item.seriesName}${seriesId === item._id ? " (Selected)" : ""}`}
                  secondary={seriesId !== item._id}
                  onPress={() => setSeriesId(item._id)}
                />
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Select Customer">
          <PickerList
            title="Customer"
            searchValue={partySearch}
            onSearchChange={setPartySearch}
            searchPlaceholder="Search customers"
            options={parties.map((item) => ({
              id: item._id,
              label: item.partyName || "Untitled Customer",
              subtitle: item.mobileNumber || item.emailID || "No contact details",
            }))}
            selectedId={partyId}
            emptyText="No customers found"
            onSelect={setPartyId}
          />
        </SectionCard>

        <SectionCard title="Select Cash / Bank">
          <PickerList
            title="Ledger"
            searchValue={cashBankSearch}
            onSearchChange={setCashBankSearch}
            searchPlaceholder="Search cash or bank ledgers"
            options={cashBanks.map((item) => ({
              id: item._id,
              label: item.partyName || "Untitled Ledger",
              subtitle: item.partyType || "No ledger type",
            }))}
            selectedId={cashBankId}
            emptyText="No cash or bank ledgers found"
            onSelect={setCashBankId}
          />
        </SectionCard>

        <PrimaryButton
          label={isSaving ? "Creating..." : "Create Receipt"}
          disabled={isSaving}
          onPress={() => void handleSave()}
        />
      </ScrollView>
    </View>
  );
}
