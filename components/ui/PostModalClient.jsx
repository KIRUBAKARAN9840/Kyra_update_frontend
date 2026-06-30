import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  FlatList,
  TextInput,
  Keyboard,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  BackHandler,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createCommentPostAPI,
  deleteCommentAPI,
  deletePostAPI,
  editPostAPI,
  getCommentPostAPI,
} from "../../services/Api";
import { Alert } from "react-native";
import { showToast } from "../../utils/Toaster";

import {
  ShimmerBlock,
  ShimmerCard,
  // ShimmerListItem,
  ShimmerProfileHeader,
  ShimmerNewsArticle,
  ShimmerGrid,
  ShimmerTextLines,
  ShimmerButton,
  ShimmerListItem,
} from "../../components/shimmerUI/ShimmerComponentsPreview";

const { width, height } = Dimensions.get("window");
const responsiveWidth = (percentage) => width * (percentage / 100);
const responsiveHeight = (percentage) => height * (percentage / 100);
const responsiveFontSize = (fontSize) => {
  const standardScreenHeight = 820;
  const standardScreenWidth = 392;
  const standardFontScale = fontSize / standardScreenHeight;
  return Math.round(height * standardFontScale);
};

const PostModalClient = ({ post, visible, onClose, getAllPosts }) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(visible);
  const [modalVisibleEdit, setModalVisibleEdit] = useState(false);
  const [comments, setComments] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [postContent, setPostContent] = useState(post.content);
  const translateY = useRef(new Animated.Value(height)).current;
  const [commetId, setCommentId] = useState(null);
  const flatListRef = useRef(null);
  const [commentLoading, setCommentLoading] = useState(false);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (modalVisible) {
          onClose();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [modalVisible, onClose]);

  const getAllComments = async () => {
    const gymId = await AsyncStorage.getItem("gym_id");
    const clientId = await AsyncStorage.getItem("client_id");

    try {
      const response = await getCommentPostAPI(
        gymId,
        post.post_id,
        clientId,
        "client"
      );
      if (response?.status === 200) {
        setComments(response?.data);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  };

  const handlePostComment = async () => {
    if (newComment.trim() === "") {
      showToast({
        type: "error",
        title: "Error",
        desc: "Please enter some text to comment",
      });
      return;
    }
    const gymId = await AsyncStorage.getItem("gym_id");
    const clientId = await AsyncStorage.getItem("client_id");

    const payload = {
      content: newComment,
      gym_id: gymId,
      post_id: post.post_id,
      client_id: clientId,
      role: "client",
    };
    try {
      // setLoading(true);
      setCommentLoading(true);
      const response = await createCommentPostAPI(payload);
      if (response?.status === 200) {
        await getAllComments();
        // await getAllPosts();
        setNewComment("");
        Keyboard.dismiss();
        if (flatListRef.current && comments?.length > 0) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setCommentLoading(false);
    }
  };

  const onEdit = async () => {
    setModalVisibleEdit(true);
    setPostContent(post.content);
  };

  const onDelete = async () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this post?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => handleDelete(),
        },
      ],
      { cancelable: true }
    );
  };

  const handleDelete = async () => {
    const gymId = await AsyncStorage.getItem("gym_id");

    try {
      setLoading(true);
      const response = await deletePostAPI(gymId, post.post_id);
      if (response?.status === 200) {
        await getAllPosts();
        onClose();
        Keyboard.dismiss();
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  const editMyPost = async () => {
    if (postContent.trim() === "") {
      showToast({
        type: "error",
        title: "Error",
        desc: "Please enter some text",
      });
      return;
    }
    const gymId = await AsyncStorage.getItem("gym_id");
    const clientId = await AsyncStorage.getItem("client_id");

    const payload = {
      content: postContent,
      gym_id: gymId,
      post_id: post.post_id,
      client_id: clientId,
      role: "client",
    };

    try {
      setLoading(true);
      const response = await editPostAPI(payload);
      if (response?.status === 200) {
        setPostContent(null);
        setModalVisibleEdit(false);
        await getAllPosts();
        onClose();
        Keyboard.dismiss();
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  const onDeleteComment = (comment) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this comment?",
      [
        {
          text: "Cancel",
          onPress: () => setCommentId(null),
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => handleDeleteComment(comment.comment_id),
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteComment = async (id) => {
    try {
      setLoading(true);
      const response = await deleteCommentAPI(id);
      if (response?.status === 200) {
        await getAllComments();
        await getAllPosts();
        setCommentId(null);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setModalVisible(true);

      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    getAllComments();
  }, []);

  const formatDate = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    }

    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    }

    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }

    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const generateAvatar = (userName, customColor) => {
    const getColorFromName = (name) => {
      if (customColor) return customColor;

      const colors = [
        "#FF5757",
        "#FF8A5B",
        "#FAC05E",
        "#64C28F",
        "#5D9CEC",
        "#AC92EC",
        "#EC87C0",
        "#48CFAD",
        "#4FC1E9",
        "#A0D568",
      ];

      let sum = 0;
      for (let i = 0; i < name.length; i++) {
        sum += name.charCodeAt(i);
      }

      return colors[sum % colors.length];
    };

    const firstLetter = userName ? userName.charAt(0).toUpperCase() : "?";
    const bgColor = getColorFromName(userName);

    return (
      <View
        style={{
          width: responsiveWidth(10),
          height: responsiveWidth(10),
          borderRadius: responsiveWidth(5),
          backgroundColor: bgColor,
          justifyContent: "center",
          alignItems: "center",
          marginRight: responsiveWidth(3),
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.2)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 1,
          elevation: 2,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: responsiveFontSize(16),
            fontWeight: "bold",
          }}
        >
          {firstLetter}
        </Text>
      </View>
    );
  };

  const renderProfileImage = (url, userName, isYou = false) => {
    if (url) {
      return (
        <Image
          source={{ uri: url }}
          style={{
            width: responsiveWidth(10),
            height: responsiveWidth(10),
            borderRadius: responsiveWidth(5),
            marginRight: responsiveWidth(3),
            borderWidth: 2,
            borderColor: isYou ? "#1DA1F2" : "transparent",
          }}
        />
      );
    }
    return generateAvatar(userName, isYou ? "#1DA1F2" : null);
  };

  if (!modalVisible) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent={false}
      animationType="none"
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="#1DA1F2" barStyle="light-content" />
      <Animated.View
        style={[styles.modalContainer, { transform: [{ translateY }] }]}
      >
        <SafeAreaView
          style={styles.safeArea}
          edges={["top", "left", "right", "bottom"]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onClose}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerText}>Comments</Text>
              <View style={styles.headerRight}>
                <Text style={styles.commentCount}>{comments?.length || 0}</Text>
                <MaterialIcons name="chat-bubble" size={20} color="#fff" />
              </View>
            </View>

            <FlatList
              ref={flatListRef}
              data={comments || []}
              keyExtractor={(item) =>
                item?.comment_id?.toString() || Math.random().toString()
              }
              ListHeaderComponent={
                <View style={styles.postContent}>
                  <View style={styles.postHeader}>
                    {post?.profile_url ? (
                      <Image
                        source={{ uri: post?.profile_url }}
                        style={styles.profileImage}
                      />
                    ) : (
                      generateAvatar(post?.user_name)
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{post?.user_name}</Text>
                      <Text style={styles.userHandle}>
                        {formatDate(post?.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.postText}>{post?.content}</Text>
                  <View style={styles.divider} />
                </View>
              }
              renderItem={({ item, index }) => {
                const isYourComment = item.is_editable;

                return (
                  <View>
                    {/* <ShimmerListItem showAvatar={false} /> */}

                    {index === 0 && commentLoading && (
                      <ShimmerListItem
                        showAvatar={true}
                        avatarSize={40}
                        titleWidth="70%"
                        subtitleWidth="50%"
                        rightContent={true}
                        style={styles.listItem}
                      />
                    )}

                    <View
                      style={[
                        styles.comment,
                        isYourComment && styles.yourComment,
                      ]}
                    >
                      {renderProfileImage(
                        item.profile_url,
                        item.user_name,
                        isYourComment
                      )}
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>
                            {item.user_name}
                            {isYourComment && (
                              <Text style={styles.youLabel}>(You)</Text>
                            )}
                          </Text>
                          <Text style={styles.commentTime}>
                            {formatDate(item.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>{item.content}</Text>
                      </View>
                      {item.is_editable && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => onDeleteComment(item)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={responsiveWidth(5)}
                            color="#1DA1F2"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons
                    name="chat-bubble-outline"
                    size={50}
                    color="#ccc"
                  />
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubText}>
                    Start the conversation
                  </Text>
                </View>
              }
              ListFooterComponent={
                loading && (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                  </View>
                )
              }
              contentContainerStyle={[
                styles.flatListContent,
                !comments?.length && { flexGrow: 1 },
              ]}
            />

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={[
                  styles.postButton,
                  !newComment.trim() && styles.postButtonDisabled,
                ]}
                onPress={handlePostComment}
                disabled={!newComment.trim() || loading}
              >
                {loading ? (
                  <MaterialIcons
                    name="hourglass-empty"
                    size={20}
                    color="#fff"
                  />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisibleEdit}
        onRequestClose={() => setModalVisibleEdit(false)}
      >
        <View style={styles.modalContainerEdit}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <TouchableOpacity
                onPress={() => {
                  setPostContent(null);
                  setModalVisibleEdit(false);
                }}
              >
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="What's on your mind?"
              value={postContent}
              onChangeText={setPostContent}
              multiline
              autoFocus
              scrollEnabled
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  !postContent.trim() && styles.modalButtonDisabled,
                ]}
                onPress={editMyPost}
                disabled={!postContent.trim() || loading}
              >
                {loading ? (
                  <Text style={styles.modalButtonText}>Saving...</Text>
                ) : (
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
    backgroundColor: "#1DA1F2",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: "#1DA1F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 10,
    marginTop: Platform.OS === "ios" ? 30 : 0,
  },
  headerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  commentCount: {
    color: "#fff",
    marginRight: 5,
    fontWeight: "bold",
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
    marginTop: 10,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  profileImage: {
    width: responsiveWidth(10),
    height: responsiveWidth(10),
    borderRadius: responsiveWidth(5),
    marginRight: responsiveWidth(3),
    borderWidth: 1,
    borderColor: "#eee",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: responsiveFontSize(16),
    fontWeight: "600",
  },
  userHandle: {
    fontSize: responsiveFontSize(12),
    color: "#666",
    marginTop: 2,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: width * 0.03,
  },
  iconButton: {
    padding: width * 0.02,
    borderRadius: width * 0.02,
    backgroundColor: "#f0f0f0",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 5,
  },
  comment: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  yourComment: {
    backgroundColor: "#f8f9ff",
  },
  commentContent: {
    flex: 1,
    marginRight: 10,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: responsiveFontSize(14),
    fontWeight: "bold",
    color: "#333",
  },
  youLabel: {
    color: "#1DA1F2",
    fontWeight: "normal",
    fontSize: responsiveFontSize(12),
  },
  commentTime: {
    fontSize: responsiveFontSize(11),
    color: "#999",
  },
  commentText: {
    fontSize: responsiveFontSize(14),
    color: "#444",
    lineHeight: responsiveFontSize(20),
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 10,
    fontWeight: "500",
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
  loadingContainer: {
    padding: 15,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#999",
  },
  commentInputContainer: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: responsiveFontSize(14),
    backgroundColor: "#f9f9f9",
    maxHeight: 100,
  },
  postButton: {
    backgroundColor: "#1DA1F2",
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    elevation: 2,
    shadowColor: "#1DA1F2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  postButtonDisabled: {
    backgroundColor: "#c7c8f7",
  },
  modalContainerEdit: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: "white",
    borderRadius: 15,
    padding: width * 0.05,
    maxHeight: height * 0.8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: width * 0.05,
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: width * 0.04,
    marginBottom: height * 0.02,
    fontSize: width * 0.04,
    height: height * 0.2,
    textAlignVertical: "top",
    backgroundColor: "#f9f9f9",
  },
  modalButtonContainer: {
    alignItems: "center",
  },
  modalButton: {
    backgroundColor: "#1DA1F2",
    padding: width * 0.03,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#1DA1F2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  modalButtonDisabled: {
    backgroundColor: "#c7c8f7",
  },
  modalButtonText: {
    color: "white",
    fontSize: width * 0.04,
    fontWeight: "600",
  },
  postText: {
    fontSize: 16,
    color: "#333",
    marginVertical: 8,
    paddingHorizontal: width * 0.03,
  },
});

export default PostModalClient;
