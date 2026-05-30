
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleUserRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import { useRouter } from "expo-router";

import DeleteConfirmSheet from "@/components/DeleteConfirmSheet";
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { userService } from "@/services/user.service";
import type { StaffUser } from "@/types/user";

function UserCard({
  user,
  onEdit,
  onDelete,
}: {
  user: StaffUser;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayName = user.name || user.userName || "Unnamed user";
  const contactLine = user.email || user.mobileNumber || "Contact unavailable";

  return (
    <View className="mb-3 flex-row items-center justify-between rounded-[14px] border-b border-slate-200 bg-white px-4 py-[14px] shadow-sm shadow-slate-900/10">
      <View className="flex-1 flex-row items-center">
        <View className="items-center justify-center rounded-[10px] bg-slate-200 p-2">
          <CircleUserRound color="#0f172a" size={24} strokeWidth={2.1} />
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              numberOfLines={1}
              className="max-w-[160px] shrink truncate text-[15px] font-extrabold text-[#0f172a] "
            >
              {displayName}
            </Text>

            {/* <View className="rounded-full bg-[#e8f1ff] px-2.5 py-1">
              <Text className="text-[13px] font-bold text-[#134074]">
                {roleLabel}
              </Text>
            </View> */}
          </View>

          <View className="mt-1 flex-row items-center">
            <Mail color="#64748b" size={13} strokeWidth={2} />
            <Text numberOfLines={1} className="ml-1.5 flex-1 text-sm text-slate-500 truncate max-w-[150px]">
              {contactLine}
            </Text>
          </View>

          {user.mobileNumber ? (
            <View className="mt-1 flex-row items-center">
              <Phone color="#64748b" size={13} strokeWidth={2} />
              <Text numberOfLines={1} className="ml-1.5 flex-1 text-sm text-slate-500 truncate max-w-[150px]">
                {user.mobileNumber}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="ml-[10px] flex-row items-center gap-[14px]">
        <Pressable hitSlop={10} onPress={onEdit} className="p-0.5">
          <Pencil color="#475569" size={18} strokeWidth={2.1} />
        </Pressable>
        <Pressable hitSlop={10} onPress={onDelete} className="p-0.5">
          <Trash2 color="#ff0f4b" size={18} strokeWidth={2.1} />
        </Pressable>
      </View>
    </View>
  );
}

export default function UsersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const deleteSheetRef = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState("");
  const [userToDelete, setUserToDelete] = useState<StaffUser | null>(null);

  const usersQuery = useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: userService.getUsers,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: async () => {
      deleteSheetRef.current?.dismiss();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
      setUserToDelete(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: async (error) => {
      deleteSheetRef.current?.dismiss();

      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "We could not delete the user. Please try again.";

      toast.error(message);
      setUserToDelete(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    const users = usersQuery.data ?? [];

    if (!search) {
      return users;
    }

    return users.filter((user) =>
      [
        user.name,
        user.userName,
        user.email,
        user.mobileNumber,
        user.role,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search)),
    );
  }, [query, usersQuery.data]);

  const handleAddUser = () => {
    router.push("/user-create");
  };

  const handleEditUser = (user: StaffUser) => {
    router.push({
      pathname: "/user-create",
      params: { id: user._id },
    });
  };

  const handleDeleteUser = (user: StaffUser) => {
    setUserToDelete(user);
    deleteSheetRef.current?.present();
  };

  const handleConfirmDelete = () => {
    if (!userToDelete || deleteUserMutation.isPending) {
      return;
    }

    deleteUserMutation.mutate(userToDelete._id);
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title="Users"
        menuItems={[
          {
            label: "Add user",
            icon: Plus,
            onPress: handleAddUser,
          },
          {
            label: "Refresh list",
            icon: RefreshCw,
            onPress: () => void usersQuery.refetch(),
          },
        ]}
        showSearch
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search users"
      />

      {usersQuery.isLoading ? (
        <PageLoader message="Loading users..." />
      ) : usersQuery.isError ? (
        <PageError
          title="Could not load users"
          description="Please check the connection and try again."
          onRetry={() => void usersQuery.refetch()}
        />
      ) : (
        <FlatList
          className="flex-1"
          contentContainerClassName="bg-white px-4 pt-[14px]"
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          nestedScrollEnabled
          renderItem={({ item }) => (
            <UserCard
              user={item}
              onEdit={() => handleEditUser(item)}
              onDelete={() => handleDeleteUser(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="mt-6 items-center rounded-[18px] bg-white px-5 py-7">
              <Text className="text-[18px] font-bold text-[#0f172a]">
                No users found
              </Text>
              <Text className="mt-1.5 text-center text-[14px] text-slate-500">
                Try a different search term or refresh the list.
              </Text>
            </View>
          }
        />
      )}

      <DeleteConfirmSheet
        sheetRef={deleteSheetRef}
        title="Delete User"
        description={
          userToDelete
            ? `${userToDelete.name || userToDelete.userName || "This user"} will be permanently removed.`
            : "This user will be permanently removed."
        }
        onConfirm={handleConfirmDelete}
        isLoading={deleteUserMutation.isPending}
      />
    </View>
  );
}
