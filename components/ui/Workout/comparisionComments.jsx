import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";

const ComparisonComments = ({ comments = [] }) => {
  const [expanded, setExpanded] = useState(false);
  const initialDisplayCount = 3;
  const needsLoadMore = comments.length > initialDisplayCount;
  const displayedComments = expanded
    ? comments
    : comments.slice(0, initialDisplayCount);

  const getCommentDirection = (comment) => {
    const lowerComment = comment.toLowerCase();
    if (
      lowerComment.includes("increased") ||
      lowerComment.includes("improved")
    ) {
      return "increase";
    } else if (
      lowerComment.includes("decreased") ||
      lowerComment.includes("reduced")
    ) {
      return "decrease";
    }
    return "neutral";
  };

  const GradientText = ({ style, children }) => {
    return (
      <MaskedView
        maskElement={
          <Text style={[styles.commentText, style]}>{children}</Text>
        }
      >
        <LinearGradient
          colors={["#297DB3", "#183243"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.commentText, style, { opacity: 0 }]}>
            {children}
          </Text>
        </LinearGradient>
      </MaskedView>
    );
  };

  return (
    <View style={styles.container}>
      {displayedComments.map((comment, index) => {
        const direction = getCommentDirection(comment);

        return (
          <View key={index} style={styles.commentCard}>
            {direction === "increase" && (
              <MaterialIcons
                name="trending-up"
                size={20}
                color="#4CAF50"
                style={styles.icon}
              />
            )}
            {direction === "decrease" && (
              <MaterialIcons
                name="trending-down"
                size={20}
                color="#F44336"
                style={styles.icon}
              />
            )}
            {direction === "neutral" && (
              <MaterialIcons
                name="trending-flat"
                size={20}
                color="#9E9E9E"
                style={styles.icon}
              />
            )}

            <View style={styles.textContainer}>
              <GradientText>{comment}</GradientText>
            </View>
          </View>
        );
      })}

      {needsLoadMore && (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.loadMoreText}>
            {expanded ? "Show less" : "Load more"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 10,
  },
  commentCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    padding: 10,
  },
  textContainer: {
    flex: 1,
    paddingRight: 2,
    paddingVertical: 2,
  },
  commentText: {
    fontSize: 12,
    fontWeight: "400",
  },
  loadMoreButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  loadMoreText: {
    color: "#297DB3",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default ComparisonComments;
