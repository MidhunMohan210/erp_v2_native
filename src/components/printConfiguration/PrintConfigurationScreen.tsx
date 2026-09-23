import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Building2,
  Calculator,
  CircleCheck,
  FileText,
  Landmark,
  ListChecks,
  PencilLine,
  Scale,
  ScrollText,
  Tag,
  Wallet,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  usePrintConfigurationQuery,
  useUpdatePrintConfiguration,
} from "@/hooks/queries/printConfigurationQueries";
import { useAppSelector } from "@/store/hooks";
import type {
  PrintConfigPatch,
  PrintVoucherType,
  VoucherPrintConfig,
} from "@/types/printConfiguration";

type SettingIcon = React.ComponentType<{
  color: string;
  size: number;
  strokeWidth: number;
}>;

type ToggleKey =
  | "enable_company_details"
  | "enable_discount_column"
  | "enable_hsn"
  | "enable_tax_percentage"
  | "enable_stock_wise_tax_amount"
  | "enable_tax_amount"
  | "enable_terms_conditions"
  | "enable_bank_details"
  | "enable_rate"
  | "enable_quantity"
  | "enable_net_amount";

type ToggleSetting = {
  key: ToggleKey;
  label: string;
  description: string;
  icon: SettingIcon;
};

type SettingRowProps = {
  icon: SettingIcon;
  label: string;
  description: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onEdit?: () => void;
};

type PrintConfigurationScreenProps = {
  voucherType: PrintVoucherType;
  voucherLabel: string;
};

const SETTINGS: ToggleSetting[] = [
  {
    key: "enable_company_details",
    label: "Company Details",
    description: "Show your business details in the print header.",
    icon: Building2,
  },
  {
    key: "enable_discount_column",
    label: "Discount Column",
    description: "Display the discount column in item rows.",
    icon: Tag,
  },
  {
    key: "enable_hsn",
    label: "HSN",
    description: "Include HSN code details for each item.",
    icon: FileText,
  },
  {
    key: "enable_tax_percentage",
    label: "Tax Percentage",
    description: "Display tax percentage beside item values.",
    icon: Calculator,
  },
  {
    key: "enable_stock_wise_tax_amount",
    label: "Stock-wise Tax Amount",
    description: "Show tax amounts item by item.",
    icon: ListChecks,
  },
  {
    key: "enable_tax_amount",
    label: "Tax Amount",
    description: "Display total tax amount in the summary.",
    icon: Calculator,
  },
  {
    key: "enable_terms_conditions",
    label: "Terms & Conditions",
    description: "Include terms and conditions in the footer.",
    icon: ScrollText,
  },
  {
    key: "enable_bank_details",
    label: "Bank Details",
    description: "Show bank account details for payment reference.",
    icon: Landmark,
  },
  {
    key: "enable_rate",
    label: "Rate",
    description: "Display item rate in the print layout.",
    icon: Scale,
  },
  {
    key: "enable_quantity",
    label: "Quantity",
    description: "Display quantity for each line item.",
    icon: ListChecks,
  },
  {
    key: "enable_net_amount",
    label: "Net Amount",
    description: "Display the final net amount in totals.",
    icon: Wallet,
  },
];

function SettingRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  onEdit,
}: SettingRowProps) {
  return (
    <View className="min-h-[88px] flex-row items-center border-b border-slate-100 py-4">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
        <Icon color="#134074" size={19} strokeWidth={2.1} />
      </View>
      <View className="ml-3 flex-1 pr-3">
        <Text className="text-[14px] font-bold text-slate-900">{label}</Text>
        <Text className="mt-1 text-[12px] leading-5 text-slate-500">
          {description}
        </Text>
      </View>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit print title"
          onPress={onEdit}
          className="rounded-xl border border-slate-300 px-4 py-2"
        >
          <Text className="text-[13px] font-semibold text-[#134074]">Edit</Text>
        </Pressable>
      ) : (
        <Switch
          accessibilityLabel={label}
          value={Boolean(checked)}
          onValueChange={onChange}
          trackColor={{ false: "#cbd5e1", true: "#7a9abd" }}
          thumbColor={checked ? "#134074" : "#f8fafc"}
        />
      )}
    </View>
  );
}

export function PrintConfigurationScreen({
  voucherType,
  voucherLabel,
}: PrintConfigurationScreenProps) {
  const insets = useSafeAreaInsets();
  const companyId = useAppSelector(
    (state) => state.company.selectedCompany?._id ?? "",
  );
  const [config, setConfig] = useState<VoucherPrintConfig | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [isTitleEditorOpen, setIsTitleEditorOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const pendingChangesRef = useRef<PrintConfigPatch>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = usePrintConfigurationQuery(companyId, voucherType);
  const { mutateAsync } = useUpdatePrintConfiguration(companyId, voucherType);

  useEffect(() => {
    if (query.data?.config) setConfig(query.data.config);
  }, [query.data?.config]);

  useEffect(() => {
    pendingChangesRef.current = {};
    setSaveStatus("idle");
  }, [companyId, voucherType]);

  const flushChanges = useCallback(async () => {
    if (!companyId || Object.keys(pendingChangesRef.current).length === 0) {
      return;
    }

    const changes = pendingChangesRef.current;
    pendingChangesRef.current = {};
    setSaveStatus("saving");
    try {
      await mutateAsync(changes);
      setSaveStatus("saved");
      if (savedLabelTimerRef.current) {
        clearTimeout(savedLabelTimerRef.current);
      }
      savedLabelTimerRef.current = setTimeout(
        () => setSaveStatus("idle"),
        1200,
      );
    } catch {
      setSaveStatus("idle");
    }
    if (Object.keys(pendingChangesRef.current).length > 0) {
      saveTimerRef.current = setTimeout(() => {
        void flushChanges();
      }, 300);
    }
  }, [companyId, mutateAsync]);

  const updateConfig = useCallback(
    (changes: PrintConfigPatch) => {
      setConfig((current) =>
        current ? { ...current, ...changes } : current,
      );
      pendingChangesRef.current = {
        ...pendingChangesRef.current,
        ...changes,
      };
      setSaveStatus("saving");

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void flushChanges();
      }, 300);
    },
    [flushChanges],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedLabelTimerRef.current) clearTimeout(savedLabelTimerRef.current);
    };
  }, []);

  const header = `${voucherLabel} Print`;
  const saveTitle = () => {
    updateConfig({ print_title: titleDraft.trim() || voucherLabel });
    setIsTitleEditorOpen(false);
  };

  if (!companyId) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title={header} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[14px] text-slate-500">
            Please select a company to configure print settings.
          </Text>
        </View>
      </View>
    );
  }

  if (query.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title={header} />
        <PageLoader message="Loading print settings..." />
      </View>
    );
  }

  if (query.isError || !config) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title={header} />
        <PageError
          title="Could not load print settings"
          description="Check your connection and try again."
          onRetry={() => query.refetch()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title={header}
        rightContent={
          <View className="min-w-16 items-end pr-3">
            {saveStatus === "saving" ? (
              <ActivityIndicator color="#64748b" size="small" />
            ) : saveStatus === "saved" ? (
              <CircleCheck color="#059669" size={20} />
            ) : null}
          </View>
        }
      />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <View className="rounded-2xl bg-white px-2">
          <SettingRow
            icon={PencilLine}
            label="Print Title"
            description="Update the title shown on the print."
            onEdit={() => {
              setTitleDraft(config.print_title);
              setIsTitleEditorOpen(true);
            }}
          />
          <SettingRow
            icon={FileText}
            label="Show Print Title"
            description="Display the print title at the top of the document."
            checked={config.show_print_title}
            onChange={(checked) => updateConfig({ show_print_title: checked })}
          />
          {SETTINGS.map((setting) => (
            <SettingRow
              key={setting.key}
              icon={setting.icon}
              label={setting.label}
              description={setting.description}
              checked={config[setting.key]}
              onChange={(checked) => updateConfig({ [setting.key]: checked })}
            />
          ))}
        </View>
      </ScrollView>
      <Modal
        visible={isTitleEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTitleEditorOpen(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-center bg-black/40 px-5"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="rounded-[24px] bg-white p-5">
            <Text className="text-[18px] font-extrabold text-slate-900">
              Edit Print Title
            </Text>
            <Text className="mt-1 text-[13px] leading-5 text-slate-500">
              Update the title shown on the print.
            </Text>
            <TextInput
              autoFocus
              value={titleDraft}
              onChangeText={setTitleDraft}
              placeholder="Enter print title"
              placeholderTextColor="#94a3b8"
              className="mt-5 rounded-2xl border border-slate-300 px-4 py-3 text-[15px] text-slate-900"
            />
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsTitleEditorOpen(false)}
                className="rounded-xl border border-slate-300 px-5 py-3"
              >
                <Text className="text-[14px] font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={saveTitle}
                className="rounded-xl bg-[#134074] px-5 py-3"
              >
                <Text className="text-[14px] font-bold text-white">Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
