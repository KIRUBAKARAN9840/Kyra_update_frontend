import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ImageBackground,
  Image,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const WorkoutSelectionModal = ({
  visible,
  items = [],
  setCurrentModalType,
  handleSelection,
  colors,
  textColor,
  arrowColor,
  height,
  width,
  imageStyle,
  imageWidth = "20%",
  textWidth = "70%",
}) => {
  const renderListItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleSelection(item.key, item.id, item.title)}
      style={styles.wrapper}
    >
      <LinearGradient
        colors={colors ? colors : ["#297DB3", "#183243"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.container}
      >
        <View style={[styles.textContainer, { width: textWidth }]}>
          <Text style={[styles.title, { color: textColor || "#fff" }]}>
            {item.title}
          </Text>
          <Text style={[styles.subtitle, { color: textColor || "#fff" }]}>
            {item.subtitle}
          </Text>
        </View>

        <View style={styles.icon}>
          <Ionicons
            name="chevron-forward"
            size={28}
            color={arrowColor || "white"}
          />
        </View>
      </LinearGradient>

      {/* Image positioned outside but at the same location */}
      <View
        style={[styles.trainerContainer, imageStyle, { width: imageWidth }]}
      >
        <Image
          source={item.imagePath}
          style={[
            styles.trainer,
            { height: height ? height : 130, width: width ? width : 116 },
          ]}
          resizeMode="contain"
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setCurrentModalType(false)}
    >
      <TouchableWithoutFeedback onPress={() => setCurrentModalType(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <FlatList
              data={items}
              renderItem={renderListItem}
              keyExtractor={(item, index) =>
                `${item.id || item.title}-${index}`
              }
              numColumns={1}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 16,
    maxHeight: height * 0.8,
    width: "95%",
  },
  listContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  wrapper: {
    paddingHorizontal: 15,
    marginBottom: 30,
    position: "relative",
    // backgroundColor: 'red',
    // marginTop: 100
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    borderRadius: 20,
    position: "relative",
    height: 110,
    width: "100%", // Ensure full width

    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  image: {
    width: "43%",
    position: "absolute",
    top: "50%",
    left: "55%",
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
  },
  trainerContainer: {
    position: "absolute",
    left: 10,
    bottom: 0,
    zIndex: 10,
  },
  trainer: {
    width: 116,
    height: 130,
  },

  textContainer: {
    width: "70%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  subtitle: {
    fontSize: 10,
    color: "white",
    marginTop: 4,
    textAlign: "center",
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
    width: "10%",
    alignSelf: "center",
  },
});

export default WorkoutSelectionModal;
