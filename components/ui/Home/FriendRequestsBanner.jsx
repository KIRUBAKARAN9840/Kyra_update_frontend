import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import styles from "./homeStyles";

const FriendRequestsBanner = ({ homeLoading, friendRequests }) => {
  const router = useRouter();

  if (homeLoading || !friendRequests?.count || friendRequests.count <= 0)
    return null;

  return (
    <TouchableOpacity
      style={styles.friendReqBanner}
      activeOpacity={0.8}
      onPress={() => router.push("/client/(gymmate)/requests")}
    >
      <View style={styles.friendReqAvatars}>
        {(friendRequests.recent_avatars || []).slice(0, 2).map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={[styles.friendReqAvatar, i > 0 && { marginLeft: -10 }]}
            contentFit="cover"
          />
        ))}
      </View>
      <View style={styles.friendReqTextWrap}>
        <Text style={styles.friendReqText}>
          You have{" "}
          <Text style={styles.friendReqCount}>{friendRequests.count}</Text> New
          Friend Requests{" "}
        </Text>
        <Image
          source={require("../../../assets/images/home/tick.png")}
          style={{ width: 22, height: 21 }}
          contentFit="contain"
        />
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#1A1A1A"
        style={{ marginLeft: "auto" }}
      />
    </TouchableOpacity>
  );
};

export default FriendRequestsBanner;
