import React from "react";
import { View } from "react-native";
import styles from "./homeStyles";

const SkeletonBox = ({ style }) => <View style={[styles.skeletonBox, style]} />;

export default SkeletonBox;
