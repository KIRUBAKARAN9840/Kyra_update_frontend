import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#6FF28D" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 14,
        fontWeight: "bold",
      }}
      text2Style={{
        fontSize: 12,
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      text1Style={{
        fontSize: 14,
        fontWeight: "bold",
      }}
      text2Style={{
        fontSize: 12,
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#87CEEB" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 14,
        fontWeight: "bold",
      }}
      text2Style={{
        fontSize: 12,
      }}
    />
  ),
};

export const showToast = ({
  type = "success",
  title = "",
  desc = "",
  visibilityTime = "3000",
}) => {
  Toast.show({
    type,
    text1: title,
    text2: desc,
    visibilityTime,
  });
};
