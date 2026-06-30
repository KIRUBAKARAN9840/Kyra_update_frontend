import axios from "axios";
import axiosInstance from "./axiosInstance";
import apiConfig from "./apiConfig";

const API_URL = apiConfig.API_URL;

export const loginAPI = async (payload) => {
  try {
    const res = await axios.post(
      `${API_URL}/api/v2/client/new_registration/login`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const registerAPI = async (payload) => {
  try {
    const res = await axios.post(
      `${API_URL}/auth/new_gym_owner_registration`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const changePasswordAPI = async (payload) => {
  try {
    const res = await axios.post(`${API_URL}/auth/change-password`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const forgotpasswordAPI = async (data, type) => {
  try {
    const res = await axios.post(`${API_URL}/auth/send-otp`, { data, type });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const VerifyOTPAPI = async (data, otp) => {
  try {
    const res = await axios.post(`${API_URL}/auth/verify-otp`, { data, otp });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const addWorkoutTemplateAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/owner/gym/addworkouttemplate`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getWorkoutTemplateAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/addworkouttemplate`, {
      params: {
        gym_id: gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editWorkoutTemplateAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(
      `/owner/gym/addworkouttemplate`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteWorkoutTemplateAPI = async (id) => {
  try {
    const res = await axiosInstance.delete(`/owner/gym/addworkouttemplate`, {
      params: {
        id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editAllWorkoutTemplateAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(
      `/owner/gym/editworkouttemplate`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getFeedPostAPI = async (
  gym_id,
  client_id,
  role,
  page = 1,
  limit = 20,
) => {
  try {
    const res = await axiosInstance.get(`/owner/get_post`, {
      params: {
        gym_id: gym_id,
        client_id: client_id,
        role: role,
        page: page,
        limit: limit,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const createFeedPostAPI = async (payload) => {
  try {
    const response = await axios.post(`${API_URL}/owner/create_post`, payload, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000,
    });

    if (!response) {
      throw new Error("No response received from server");
    }

    return {
      status: response.status || 500,
      data: response.data || null,
      message: response.data?.message || "Post created successfully",
    };
  } catch (error) {
    console.error("API Error:", error);
  }
};

export const FetchBlockedUsersAPI = async (client_id, role) => {
  try {
    const res = await axiosInstance.get(`/owner/get_blocked_users`, {
      params: {
        client_id,
        role,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const UnblockUserAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/unblock_users`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const likeFeedPostAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/post_likes`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const createCommentPostAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/create_comment`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getCommentPostAPI = async (gym_id, post_id, client_id, role) => {
  try {
    const res = await axiosInstance.get(`/owner/fetch_comment`, {
      params: {
        gym_id,
        post_id,
        client_id,
        role,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getProfileDataAPI = async (gym_id, owner_id, client_id, role) => {
  try {
    const res = await axiosInstance.get(`/owner/profile_data`, {
      params: {
        gym_id,
        client_id,
        owner_id,
        role,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editPostAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/owner/edit_post`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deletePostAPI = async (gym_id, post_id, role) => {
  try {
    const res = await axiosInstance.delete(`/owner/delete_post`, {
      params: {
        gym_id,
        post_id,
        role,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteCommentAPI = async (comment_id) => {
  try {
    const res = await axiosInstance.delete(`/owner/delete_comment`, {
      params: {
        comment_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getLikesDataAPI = async (gym_id, post_id) => {
  try {
    const res = await axiosInstance.get(`/owner/liked_by_names`, {
      params: {
        gym_id,
        post_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getClientDataAPI = async (gym_id, client_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/client_data`, {
      params: {
        gym_id,
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getGymHomeDataAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.post(`/owner/gym/home`, {
      gym_id,
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getClientsAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/client`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getPlansandBatchesAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/plans_and_batches`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getFeeDetailsAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/get_fee_details`, {
      params: {
        training_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const updateFeeStatusAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/owner/gym/update_fee_status`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteFeeStatusAPI = async (id, gymId) => {
  try {
    const res = await axiosInstance.delete(`/owner/gym/delete_fee_status`, {
      params: {
        client_id: id,
        gym_id: gymId,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getAnalysisAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/hourly_agg`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const addClientAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/gym/add_client_data`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const addTrainerAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/gym/add_trainer`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getTrainersAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/get_trainers`, {
      params: {
        gym_id: gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const updateTrainerAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/owner/gym/edit_trainer`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteTrainerAPI = async (id) => {
  try {
    const res = await axiosInstance.delete(`/owner/gym/delete_trainer`, {
      params: {
        trainer_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const addPlanAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/gym/add_plan`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editPlanAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/owner/gym/edit_plan`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deletePlanAPI = async (id) => {
  try {
    const res = await axiosInstance.delete(`/owner/gym/delete_plan`, {
      params: {
        id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const addBatchAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/gym/add_batch`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editBatchAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/owner/gym/edit_batch`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteBatchAPI = async (id) => {
  try {
    const res = await axiosInstance.delete(`/owner/gym/delete_batch`, {
      params: {
        batch_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const addDietTemplateAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/gym/adddiettemplate`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getDietTemplateAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/getdiettemplate`, {
      params: {
        gym_id: gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editDietTemplateAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(
      `/owner/gym/updatediettemplate`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteDietTemplateAPI = async (id) => {
  try {
    const res = await axiosInstance.delete(`/owner/gym/deletediettemplate`, {
      params: {
        id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editAllDietTemplateAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/owner/gym/editdiettemplate`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getAsssignmentsAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym_assigned_data`, {
      params: {
        gym_id: gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const updateProfileAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/owner/update_profile`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const assignTrainerAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/assign_trainer`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getFeedbacksAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/feedback`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getConversationsAPI = async (gym_id, user_id) => {
  try {
    const res = await axiosInstance.get(`/owner/conversations`, {
      params: {
        gym_id,
        user_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getMessagesAPI = async (gym_id, user_id, owner_id) => {
  try {
    const res = await axiosInstance.get(`/owner/owner_messages`, {
      params: {
        gym_id,
        user_id,
        owner_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const sendMessageAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/send_message_owners`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getUnverifiedClientsAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/pending_clients`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const updateUnverifiedClientsAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(
      `/owner/gym/edit_pending_clients`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteUnverifiedClientsAPI = async (id) => {
  try {
    const res = await axiosInstance.delete(`/owner/gym/delete_pending_client`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const updateVerificationStatusAPI = async (payload) => {
  try {
    const res = await axios.post(
      `${API_URL}/auth/update_verification_status`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const sendEmailVerificationOTPAPI = async (payload) => {
  try {
    const res = await axios.post(
      `${API_URL}/auth/send_verification_otp`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const resendOTPAPI = async (data, type, role, id) => {
  try {
    const res = await axios.post(`${API_URL}/auth/resend-otp`, {
      data,
      type,
      role,
      id,
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getRewardsAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/get_rewards`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const createRewardAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/gym/create_rewards`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const updateRewardAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/owner/gym/update_rewards`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteRewardAPI = async (reward_id) => {
  try {
    const res = await axiosInstance.delete(`/owner/gym/delete_rewards`, {
      params: {
        reward_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getPrizeListAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/get_prize_list`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getGymLocationAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/owner/gym/get_location`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const updateGymLocationAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/owner/gym/add_location`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const changeGymLocationAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/owner/gym/edit_location`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const OTPVerificationAPI = async (data, otp, role) => {
  try {
    const res = await axios.post(
      `${API_URL}/api/v2/client/new_registration/verify-otp`,
      {
        data,
        otp,
        role,
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getGymAnnouncementsAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/gym_feed/get_announcements`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getGymOffersAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/gym_feed/get_offer`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
