import axios from "axios";
import axiosInstance from "./axiosInstance";
import apiConfig from "./apiConfig";
const API_URL = apiConfig.API_URL;

//---------------------My Gym Page api ---------------------

export const clientMyGymAPI = async (payload) => {
  try {
    const res = await axiosInstance.get(`/my_gym/get_other_details`, {
      params: {
        gym_id: payload.gym_id,
        client_id: payload.client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const allowDataSharingAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/my_gym/toggling_data_sharing`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Trainer Assigned Workout Plan api ---------------------

export const getGymTemplateClientAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`/my_gym/gym_workout_template`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Sidebar api ---------------------

export const getSidebarDataAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/sidebar/data`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//---------------------Home Page api ---------------------

export const dismissWelcomeCreditBannerAPI = async () => {
  try {
    const res = await axiosInstance.post(`/home/dismiss_welcome_credits`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const dismissFreeCreditsAPI = async () => {
  try {
    const res = await axiosInstance.post(`/api/v2/home/dismiss_free_credits`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const clientProgressAPI = async (payload) => {
  try {
    const res = await axiosInstance.get(`/my_progress/data`, {
      params: {
        gym_id: payload.gym_id,
        client_id: payload.client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const checkClientTargetsAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/check_client_target/get`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getWeightJourneyAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/weight_progress/data`);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
//---------------------Refresh token api ---------------------

export const refreshtokenAPI = async (id, role) => {
  try {
    const res = await axios.get(`${API_URL}/auth/refresh`, {
      params: {
        id,
        role,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
//---------------------General Analysis api ---------------------

export const clientGeneralAnalysisAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`/general_analysis/client`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
//---------------------Workout and Diet Analysis api ---------------------

export const clientDietAnalysisAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`/diet_analysis/get`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const clientWorkoutAnalysisAPI = async (
  id,
  startDate = null,
  endDate = null,
) => {
  try {
    const params = {
      client_id: id,
    };

    // Add date parameters if provided
    if (startDate) {
      params.start_date = startDate;
    }
    if (endDate) {
      params.end_date = endDate;
    }

    const res = await axiosInstance.get(`/workout_analysis/get`, {
      params: params,
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
//---------------------Workout and Diet Report api ---------------------

export const clientReportAPI = async (
  id,
  date,
  startDate = null,
  endDate = null,
) => {
  try {
    const params = {
      client_id: id,
    };

    // If startDate and endDate are provided, use date range query
    if (startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    } else if (date) {
      // Otherwise, use single date query
      params.date = date;
    }

    const res = await axiosInstance.get(`/client_report/get`, {
      params,
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
//---------------------Workout Template CRUD api ---------------------

export const getWorkoutTemplateClientAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`/personal_template/get`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const addClientWrokoutTemplateAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/personal_template/add`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editClientWorkoutTemplateNameAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/personal_template/update`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteClientWorkoutTemplateAPI = async (id) => {
  try {
    const res = await axiosInstance.delete(`/personal_template/delete`, {
      params: {
        id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editClientWorkoutTemplateExerciseAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/personal_template/edit`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
//---------------------Fittbot & Home Workout api ---------------------

export const getFittbotWorkoutReportAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/fittbot-workout/report`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getFittbotWorkoutHistoryAPI = async (workout_date) => {
  try {
    const res = await axiosInstance.get(`/api/v2/fittbot-workout/history`, {
      params: { workout_date },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getFittbotWorkoutAPI = async (id) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/fittbot-workout/muscle-groups`,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getFittbotExercisesAPI = async (muscle_group, category) => {
  try {
    const res = await axiosInstance.get(`/api/v2/fittbot-workout/exercises`, {
      params: { muscle_group, category },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getFittbotExerciseDetailAPI = async (
  muscle_group,
  exercise_id,
  category,
) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/fittbot-workout/exercise-detail`,
      {
        params: { muscle_group, exercise_id, category },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};
export const getHomeWorkoutAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`/home_workout/get`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getMachinesAPI = async () => {
  try {
    const res = await axiosInstance.get(`/equipment/catalog`);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getExercisesAPI = async (equipment_name) => {
  try {
    const res = await axiosInstance.get(`/equipment/exercises`, {
      params: {
        equipment_name,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getEquipmentHistoryAPI = async (equipment_name, client_id) => {
  try {
    const res = await axiosInstance.get(`/equipment/history`, {
      params: {
        equipment_name,
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
//---------------------Diet Template CRUD api ---------------------

export const getDietTemplateClientAPI = async (id, method) => {
  try {
    const res = await axiosInstance.get(`/api/v2/diet_personal_template/get`, {
      params: {
        method: method,
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getSingleDietTemplateAPI = async (template_id) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/diet_personal_template/get_single_diet_template`,
      {
        params: {
          id: template_id,
        },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const addClientDietTemplateAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/diet_personal_template/add`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editClientDietTemplateNameAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(
      `/api/v2/diet_personal_template/delete`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteClientDietTemplateAPI = async (id) => {
  try {
    const res = await axiosInstance.delete(
      `/api/v2/diet_personal_template/delete`,
      {
        params: {
          id,
        },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editClientDietTemplateDishesAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(
      `/diet_personal_template/edit`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const updateDietTemplateMeals = async (payload) => {
  try {
    const res = await axiosInstance.put(
      `/api/v2/diet_personal_template/edit`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Workout CRUD api ---------------------

export const logWorkoutSetAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/api/v2/log-workout/add`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const removeWorkoutSetAPI = async (set_id) => {
  try {
    const res = await axiosInstance.post(`/api/v2/log-workout/remove_set`, {
      set_id,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const addClientWorkoutAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/actual_workout/add`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editClientWorkoutAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/actual_workout/edit`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getClientWorkoutAPI = async (id, date) => {
  try {
    const res = await axiosInstance.get(`/actual_workout/get`, {
      params: {
        client_id: id,
        date,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteClientWorkoutAPI = async (id, client_id) => {
  try {
    const res = await axiosInstance.delete(`/actual_workout/delete`, {
      params: {
        record_id: id,
        client_id: client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Diet CRUD api ---------------------

export const addClientDietAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/api/v2/log_food/add`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getClientDietAPI = async (
  id,
  date,
  startDate = null,
  endDate = null,
  mealTypes = null,
) => {
  try {
    const params = {
      client_id: id,
    };

    // If startDate and endDate are provided, use date range query
    if (startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    } else if (date) {
      // Otherwise, use single date query
      params.date = date;
    }

    // Add meal types filter if provided
    if (mealTypes && mealTypes.length > 0) {
      params.meal_types = mealTypes.join(",");
    }

    const res = await axiosInstance.get(`/actual_diet/get`, {
      params,
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editClientDietAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/actual_diet/edit`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteClientDietAPI = async (id, client_id, gym_id, date) => {
  try {
    const res = await axiosInstance.delete(`/actual_diet/delete`, {
      params: {
        record_id: id,
        client_id,
        gym_id,
        date,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------KyraAI api ---------------------

export const addClientDietAIAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/log_food/add_scanned`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const closeChatbotAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/chatbot/delete_chat`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Attendance api ---------------------

export const getInStatusAPI = async (id, gym_id) => {
  try {
    const res = await axiosInstance.get(`/attendance/check`, {
      params: {
        client_id: id,
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getPunchedInDetailsAPI = async (client_id, gym_id) => {
  try {
    const res = await axiosInstance.get(
      `/attendance/attendance_status_with_location`,
      {
        params: {
          client_id,
          gym_id,
        },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const addPunchInAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/attendance/in_punch`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const addPunchOutAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/attendance/out_punch`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Scan QR api ---------------------

export const QRAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/qr/scan`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
//---------------------Feedback api ---------------------

export const sendFeedbackAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/feedback/create_feedback`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
//---------------------Profile Page api ---------------------

export const getClientProfileDetailsAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/profile/data`);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editClientProfileAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/api/v2/profile/details`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Avatar api ---------------------

export const clientAvatarsAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`/profile/get_fittbot_avatars`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const editAvatarAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/profile/update_avatar`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
//---------------------Weight , Water , Calories Input api ---------------------

export const ClientWeightUpdateNewAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/my_progress/add_inputs`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const ClientWeightUpdateNew = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/weight_progress/add_weight`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
export const ClientCaloriesAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/diet_apis/set_target`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Gym Buddy api ---------------------

export const gymBuddyCreateSessionAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/gym_buddy/create_session`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const gymBuddyRescheduleSessionAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(
      `/gym_buddy/reschedule_session`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const gymBuddyRemoveParticipantsSessionAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/gym_buddy/remove_participants`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getGymBuddySessionsAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/gym_buddy/get_session`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const gymBuddyJoinProposalAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/gym_buddy/join_session`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const gymBuddyAcceptProposalAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/gym_buddy/accept_session`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const gymBuddyDeclineProposalAPI = async (
  session_id,
  proposal_id,
  proposer_id,
  gym_id,
) => {
  try {
    const res = await axiosInstance.delete(`/gym_buddy/delete_proposal`, {
      params: {
        session_id,
        proposal_id,
        proposer_id,
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const gymBuddyDeleteSessionAPI = async (session_id, gym_id) => {
  try {
    const res = await axiosInstance.delete(`/gym_buddy/delete_session`, {
      params: {
        session_id,
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Desi Diet api ---------------------

export const getAllFoodsAPI = async (pageNum, ITEMS_PER_PAGE) => {
  try {
    const res = await axiosInstance.get(`/food/get`, {
      params: {
        page: pageNum,
        limit: ITEMS_PER_PAGE,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const searchAllFoodsAPI = async (char, page, limit) => {
  try {
    const res = await axiosInstance.get(`/food/search`, {
      params: {
        query: char,
        page,
        limit,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getFoodCategoriesAPI = async () => {
  try {
    const res = await axiosInstance.get(`/food/get_categories`);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getFoodsByCategoryAPI = async (categories, page, limit) => {
  try {
    const categoriesString = Array.isArray(categories)
      ? categories.join(",")
      : categories;

    const res = await axiosInstance.get(`/food/categories`, {
      params: {
        categories: categoriesString,
        page,
        limit,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Auto-Calculate calories api ---------------------

export const caloriesCalculateAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/calculate_macros/calculate`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Water api ---------------------

export const clientWaterTrackerAPI = async (payload) => {
  try {
    const res = await axiosInstance.get(`/water/get`, {
      params: {
        gym_id: payload.gym_id,
        client_id: payload.client_id,
      },
    });

    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getWaterStatusAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/water/get`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const addWaterAPI = async () => {
  try {
    const res = await axiosInstance.post(`/api/v2/water/add`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const setWaterTargetAPI = async (target_water) => {
  try {
    const res = await axiosInstance.post(`/api/v2/water/set_target`, {
      target_water,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//---------------------Rewards api ---------------------

export const getClientRewardsAPI = async () => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/reward_program/show_rewards_page`,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Leaderboard api ---------------------

export const getClientLeaderboardAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/leaderboard/get`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------get XP api (headers)---------------------

export const getClientXpAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/xp/get`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Manual Diet Addition api ---------------------

export const getCommonFooodAPI = async () => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/diet_personal_template/common_food/consumed`,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const searchClientFoodAPI = async (query) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/diet_personal_template/common_food/search`,
      {
        params: {
          query,
        },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Report & Block Users api ---------------------

export const reportPostAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/community/report_user`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const blockPostAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/community/block_user`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//--------------------- user registration api ---------------------

export const registerUserAPI = async (payload) => {
  try {
    const res = await axios.post(`${API_URL}/auth/register-user`, payload);
    return res?.data;
    ``;
  } catch (err) {
    return err?.response?.data;
  }
};

export const registerUserOTPVerification = async (payload) => {
  try {
    const res = await axios.post(
      `${API_URL}/client/new_registration/verify-otp`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const checkReferral = async (code) => {
  try {
    const res = await axios.get(`${API_URL}/auth/validate-referral-code`, {
      params: {
        code,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const registerUserCompleteRegistration = async (payload) => {
  try {
    const res = await axios.post(
      `${API_URL}/auth/complete-registeration`,
      payload,
    );

    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Manage Gym Membership api ---------------------

export const getUUIDAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/api/v2/bookings/gym_membership/all`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const cancelMembershipAPI = async (membership_id, client_id) => {
  try {
    const res = await axiosInstance.post(`/client_qr/cancel_membership`, null, {
      params: {
        membership_id,
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//--------------------- Unsubscribed User Home details api ---------------------

export const getUnsubscribedHomeAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/unpaid/home`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//--------------------- Reminder api ---------------------

export const createReminderAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/api/v2/water/set_reminder`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getRemindersAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/reminder/get_reminders`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteRemindersAPI = async (id) => {
  try {
    const res = await axiosInstance.delete(`/api/v2/water/delete_reminder`, {
      params: {
        reminder_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Expo token api ---------------------

export const updateExpoTokenAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/expo_token/update`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Send file details to AWS(feed) api ---------------------

export const hasMediainPostAPI = async (payload) => {
  try {
    const response = await axios.post(
      `${API_URL}/feed/create_presigned_url`,
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      },
    );

    if (!response) {
      throw new Error("No response received from server");
    }

    return response.data;
  } catch (error) {
    console.error("API Error:", error);
  }
};

//--------------------- Default Workout api ---------------------

export const getDefaultWorkoutAPI = async (gender, level, goals) => {
  try {
    const res = await axiosInstance.get(
      `/default_workout_template/get_default_workout`,
      {
        params: {
          gender,
          level,
          goals,
        },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//--------------------- Default diet api ---------------------

export const getDefaultSingleDietTemplate = async (templateId) => {
  try {
    const res = await axiosInstance.get(`/default_diet_template/get`, {
      params: {
        id: templateId,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getNewDefaultDietTemplate = async ({
  client_id,
  expertise_level,
  cousine,
  goal_type,
}) => {
  try {
    const res = await axiosInstance.get(`/default_diet_template/get`, {
      params: {
        client_id,
        expertise_level,
        cousine,
        goal_type,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getDefaultDietTemplate = async () => {
  try {
    const res = await axiosInstance.get(
      `/default_diet_template/fittbot_template`,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//--------------------- Help and support ---------------------

export const supportAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/support_token/generate`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Smart Watch api ---------------------

export const getSmartWatchInterestAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/reward_interest/show_interest`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const showSmartWatchInterestAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/smartwatch/show_interest`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Avail Free Trial api ---------------------

export const availFreeTrial = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/free_trial/avail_free_trial`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const scanFoodAPI = async (formData) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/food_scanner/analyze`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getAllPlans = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/fittbot_plans/get_plans`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getGymStudiosAPI = async (params) => {
  try {
    const res = await axiosInstance.get(`/gym_studios/list_gyms`, {
      params: {
        ...params,
      },
      paramsSerializer: {
        indexes: null, // Send arrays without brackets: selected_sessions=3&selected_sessions=4
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getDailyPassGymsAPI = async (params) => {
  try {
    const res = await axiosInstance.get(`/api/v2/daily_pass/gyms`, {
      params: {
        ...params,
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getMembershipGymsAPI = async (params) => {
  try {
    const res = await axiosInstance.get(`/api/v2/gym_membership/gyms`, {
      params: {
        ...params,
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getPTGymsAPI = async (params) => {
  try {
    const res = await axiosInstance.get(`/api/v2/personal_training/gyms`, {
      params: {
        ...params,
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getPTBookingDataAPI = async (
  gym_id,
  trainer_id,
  schedule_id,
  dates,
) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/personal_training_bookings/data`,
      {
        params: { gym_id, trainer_id, schedule_id, dates },
        paramsSerializer: { indexes: null },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getPTTrainersAPI = async (params) => {
  try {
    const res = await axiosInstance.get(`/api/v2/personal_training/trainers`, {
      params,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getPTTrainerSlotsAPI = async (params) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/personal_training/trainer_slots`,
      {
        params,
        paramsSerializer: { indexes: null },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getSessionsGymsAPI = async (params) => {
  try {
    const res = await axiosInstance.get(`/api/v2/sessions/get_slots`, {
      params: {
        ...params,
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getOneGymDetail = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/api/v2/gym_membership/gym_details`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getPaymentSummaryDetail = async (gym_id, plan_id) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/gym_membership_bookings/data`,
      {
        params: {
          gym_id,
          plan_id,
        },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const applyCouponCode = async (gym_id, plan_id, coupon_code) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_membership_bookings/apply_coupon`,
      { gym_id, plan_id, coupon_code },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getGymDetail = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/api/v2/daily_pass/gym_details`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getGymDetailsPricing = async (gym_id) => {
  try {
    const res = await axiosInstance.get(
      `/api/v3/daily_pass_v3/gym_details_pricing`,
      { params: { gym_id } },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getPaymentDetailSession = async (
  gym_id,
  session_id,
  schedule_id,
  dates,
) => {
  try {
    const res = await axiosInstance.get(`/api/v2/session_bookings/data`, {
      params: {
        gym_id,
        session_id,
        schedule_id,
        dates,
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};
export const getDailyPassDetails = async (
  gym_id,
  number_of_days,
  head_count,
) => {
  try {
    const res = await axiosInstance.get(`/api/v2/dailypass_details/data`, {
      params: {
        gym_id,
        ...(number_of_days !== undefined && { number_of_days }),
        head_count,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const applyDailyPassCoupon = async (coupon_code) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/dailypass_details/apply_coupon`,
      { coupon_code },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const redeemDailyPassPromo = async (
  coupon_code,
  gym_id,
  selected_date,
) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/dailypass_details/redeem_promo`,
      { coupon_code, gym_id, selected_date },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getOneGymStudio = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/gym_studios/gym`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const joinRequestAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/offline_requests/join`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const sendRequestAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/offline_requests/add`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const deleteRequestAPI = async (id) => {
  try {
    const res = await axiosInstance.delete(`/client_qr/delete_request`, {
      params: {
        id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getUpgradePassDetails = async (gym_id, pass_id, client_id) => {
  try {
    const res = await axiosInstance.get(`/get_dailypass/upgrade/preview`, {
      params: {
        new_gym_id: gym_id,
        pass_id,
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getPersonalTraining = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/my_gym/personal-training-details`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const createGymOrderAPIOld = async (
  gym_id,
  plan_id,
  client_id,
  selectedFittbotPlan,
  reward,
) => {
  try {
    const res = await axiosInstance.post(
      "/gym_membership_rg/checkout/unified-create-order",
      {
        gym_id,
        plan_id,
        client_id,
        includeSubscription: true,
        is_existing: false,
        selectedFittbotPlan,
        reward,
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const verifyGymPaymentAPIOld = async (
  razorpay_payment_id,
  razorpay_order_id,
  razorpay_signature,
  client_id,
  reward,
  reward_applied,
) => {
  try {
    const res = await axiosInstance.post(
      "/gym_membership_rg/checkout/unified-verify",
      {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        client_id,
        reward,
        reward_applied,
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------Daily Pass api ---------------------

export const getAllDailyPassesAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/api/v3/daily_pass_v3/my_passes`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

// Generate QR for a pack pass day
export const generatePackDailyPassAPI = async (pass_id, date) => {
  try {
    const res = await axiosInstance.post(`api/v3/daily_pass_v3/generate_qr`, {
      pass_id,
      date,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getTodayQrAPI = async (daily_pass_id) => {
  try {
    const res = await axiosInstance.get(`/dailypass_qr/get`, {
      params: {
        daily_pass_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const editDailyPassAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/get_dailypass/edit`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getWelcomeDataAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/auth/weight-management-duration`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

// purchase history

export const getSubscriptionDetailsAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/purchase_history/get_subscription`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getMembershipDetailsAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/purchase_history/get_membership`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getDailyPassDetailsAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/purchase_history/get_daily_pass`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getGymIDAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/get_gym_id/reset`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//--------------------- Get My Plans API ---------------------

export const getMyFittbotPlanAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`/manage_subscriptions/get`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//cancel fittbot subscription

export const cancelFittbotSubscription = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/manage_subscriptions/cancel_subscription`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//redeem cash
export const redeemCash = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/reward_program/redeem_points`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//7 days free trial
export const freeTrialAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/free_trial/activate`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//Reward apply
export const rewardApplyAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/gym_studios/calculate_rewards`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//Reward apply
export const rewardApplyDailPassAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/pay/calculate_reward`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//Pause Membership
export const PauseMembershipAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/client_qr/pause_membership`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//Continue Membership
export const ContinueMembershipAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/client_qr/continue_membership`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//--------------------- Referral Code get API ---------------------

export const getMyReferralCodeAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`/referral/get`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//ratings & feedback
export const ratingFeedbackAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/ratings/create`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//--------------------- Version Control API ---------------------

export const getVersionAPI = async (version, platform) => {
  try {
    const res = await axiosInstance.get(`/app/version`, {
      params: {
        current_version: version,
        app: "fittbot",
        platform,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//new payment API

export const createGymOrderAPI = async (
  gym_id,
  plan_id,
  client_id,
  selectedFittbotPlan,
  reward,
  coupon_code,
) => {
  try {
    // Use v2 concurrent endpoint
    const { data: checkoutCommand } = await axiosInstance.post(
      "/pay/gym_membership_v2/checkout",
      {
        gym_id: Number(gym_id),
        plan_id: Number(plan_id),
        client_id: String(client_id),
        includeSubscription: true,
        is_existing: false,
        selectedFittbotPlan: selectedFittbotPlan
          ? Number(selectedFittbotPlan)
          : null,
        reward: !!reward,
        coupon_code: coupon_code || null,
      },
    );

    // Poll for completion
    const checkout = await waitForGymMembershipCommand(
      checkoutCommand?.request_id,
      "/pay/gym_membership_v2/commands/",
      "gym membership checkout",
    );

    return checkout;
  } catch (err) {
    console.error("Gym membership checkout error:", err);
    return {
      error: true,
      message: err?.message || "Checkout failed",
      ...err?.response?.data,
    };
  }
};

export const verifyGymPaymentAPI = async (
  razorpay_payment_id,
  razorpay_order_id,
  razorpay_signature,
  client_id,
  reward,
  reward_applied,
) => {
  try {
    // Use v2 concurrent endpoint
    const { data: verifyCommand } = await axiosInstance.post(
      "/pay/gym_membership_v2/verify",
      {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        reward: !!reward,
        reward_applied: reward_applied || 0,
      },
      {
        headers: {
          "Idempotency-Key": String(razorpay_order_id),
          "ngrok-skip-browser-warning": "true",
        },
      },
    );

    // Poll for completion
    const verification = await waitForGymMembershipCommand(
      verifyCommand?.request_id,
      "/pay/gym_membership_v2/commands/",
      "gym membership verify",
    );

    return verification;
  } catch (err) {
    console.error("Gym membership verify error:", err);
    return {
      error: true,
      verified: false,
      message: err?.message || "Verification failed",
      ...err?.response?.data,
    };
  }
};

const waitForGymMembershipCommand = async (
  requestId,
  commandPath = "/pay/gym_membership_v2/commands/",
  label = "gym membership command",
) => {
  const buildCommandUrl = (reqId, cmdPath) => {
    if (!reqId) return "";
    const base =
      (axiosInstance.defaults?.baseURL || "").replace(/\/$/, "") || "";
    const path = cmdPath.endsWith("/") ? cmdPath : `${cmdPath}/`;
    return `${base}${path}${reqId}`;
  };

  const commandUrl = buildCommandUrl(requestId, commandPath);
  if (!commandUrl) {
    throw new Error(`Unable to resolve ${label} status URL`);
  }

  const maxAttempts = 20;
  let delayMs = 1500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data } = await axiosInstance.get(commandUrl, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });

    if (data?.status === "completed") {
      return data?.data || {};
    }

    if (data?.status === "failed") {
      throw new Error(data?.error || `${label} failed. Please try again.`);
    }

    const jitterMs = Math.random() * 300;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(delayMs + jitterMs, 10000)),
    );
    delayMs = Math.min(delayMs * 1.5, 10000);
  }

  throw new Error(
    `${label} is taking longer than expected. Please retry in a moment.`,
  );
};

// export const createGymOrderAPI = async (
//   gym_id,
//   plan_id,
//   client_id,
//   selectedFittbotPlan,
//   reward
// ) => {
//   try {
//     // Use v2 concurrent endpoint
//     const { data: checkoutCommand } = await axiosInstance.post(
//       "ip_v2/checkout",
//       {
//         gym_id: Number(gym_id),
//         plan_id: Number(plan_id),
//         client_id: String(client_id),
//         includeSubscription: true,
//         is_existing: false,
//         selectedFittbotPlan: selectedFittbotPlan
//           ? Number(selectedFittbotPlan)
//           : null,
//         reward: !!reward,
//       }
//     );

//     // Poll for completion
//     const checkout = await waitForGymMembershipCommand(
//       checkoutCommand?.status_url,
//       "gym membership checkout"
//     );

//     return checkout;
//   } catch (err) {
//     console.error("Gym membership checkout error:", err);
//     return {
//       error: true,
//       message: err?.message || "Checkout failed",
//       ...err?.response?.data,
//     };
//   }
// };

// export const verifyGymPaymentAPI = async (
//   razorpay_payment_id,
//   razorpay_order_id,
//   razorpay_signature,
//   client_id,
//   reward,
//   reward_applied
// ) => {
//   try {
//     // Use v2 concurrent endpoint
//     const { data: verifyCommand } = await axiosInstance.post(
//       "/pay/gym_membership_v2/verify",
//       {
//         razorpay_payment_id,
//         razorpay_order_id,
//         razorpay_signature,
//         reward: !!reward,
//         reward_applied: reward_applied || 0,
//       },
//       {
//         headers: {
//           "Idempotency-Key": String(razorpay_order_id),
//           "ngrok-skip-browser-warning": "true",
//         },
//       }
//     );

//     // Poll for completion
//     const verification = await waitForGymMembershipCommand(
//       verifyCommand?.status_url,
//       "gym membership verify"
//     );

//     return verification;
//   } catch (err) {
//     console.error("Gym membership verify error:", err);
//     return {
//       error: true,
//       verified: false,
//       message: err?.message || "Verification failed",
//       ...err?.response?.data,
//     };
//   }
// };

//--------------------- Available Sessions API ---------------------

export const getAvailableSessionsAPI = async (gymId) => {
  try {
    const res = await axiosInstance.get(`/client/sessions/list`, {
      params: {
        gym_id: gymId,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------  Sessions Price API ---------------------

export const getAvailableSessionsPriceAPI = async (
  gymId,
  id,
  trainer_id,
  is_offer_eligible = false,
) => {
  try {
    const res = await axiosInstance.get(`/client/sessions/price`, {
      params: {
        gym_id: gymId,
        session_id: id,
        trainer_id: trainer_id,
        is_offer_eligible: is_offer_eligible,
      },
    });

    return res?.data;
  } catch (err) {
    console.error("🔥 getAvailableSessionsPriceAPI error:", err);
    return err?.response.data;
  }
};

//---------------------  Personal Trainers API ---------------------

export const getAvailablePersonalTrainersAPI = async (gymId, id) => {
  try {
    const res = await axiosInstance.get(`/client/sessions/price`, {
      params: {
        gym_id: gymId,
        session_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------  Available Days API ---------------------

export const getAvailableSessionDaysAPI = async (gym_id, id, trainer_id) => {
  try {
    const res = await axiosInstance.get(`/client/sessions/dates`, {
      params: {
        gym_id: gym_id,
        session_id: id,
        trainer_id: trainer_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------  Dates send API ---------------------

export const sendSelectedDatesAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/client/sessions/slots`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------  Available Slots API ---------------------

// export const getAvailableSessionSlotsAPI = async (gym_id, id) => {
//   try {
//     const res = await axiosInstance.get(`/client/sessions/dates`, {
//       params: {
//         gym_id: gym_id,
//         session_id: id,
//       },
//     });
//     return res?.data;
//   } catch (err) {
//     return err?.response.data;
//   }
// };

//---------------------  Dates send API ---------------------

export const sendSelectedSlotsAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/client/sessions/review`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------  Available Trainers API ---------------------

export const getAvailableTrainersAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/client/sessions/get_trainers`, {
      params: {
        gym_id: gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------  Booked Sessions API ---------------------

export const getBookedSessionsAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`api/v2/bookings/sessions/upcoming`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------  Booked Sessions API ---------------------

export const getSessionsPurchaseHistoryAPI = async (id) => {
  try {
    const res = await axiosInstance.get(`/purchase_history/get_session`, {
      params: {
        client_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//---------------------  get Nutrition dates Sessions API ---------------------

export const getNutritionPackageDataAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/nutrition_purchase_new/data`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getAvailableDatesNutritionAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/nutrition_purchase_new/dates`);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getDietReportAPI = async (date) => {
  try {
    const params = date ? { date } : {};
    const res = await axiosInstance.get(`/api/v2/diet_report/get`, { params });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getMacrosAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/api/v2/diet_apis/get_macros_micros`);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getDietCoachFoodsByPreferenceAPI = async (preference) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/diet_apis/foods_by_preference`,
      {
        params: { preference },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getAvailableSlotsNutritionAPI = async (date) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/nutrition_purchase_new/slots`,
      {
        params: {
          date: date,
        },
      },
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const bookNutritionSlotAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/nutrition_purchase_new/book`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const joinNutritionSession = async (id) => {
  try {
    const res = await axiosInstance.get(`/api/v2/home/nutrition/join`, {
      params: {
        booking_id: id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getNutritionPageAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/nutrition/page`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getNutritionDietAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/nutrition_diet/get`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const addNutritionStepAPI = async (id, step) => {
  try {
    const res = await axiosInstance.post(`/api/v2/nutrition_diet/add_step`, {
      id,
      step,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const modalAllPagesAPI = async (clientId, fromContest) => {
  try {
    const res = await axiosInstance.get(`/general_modal/check`, {
      params: {
        client_id: clientId,
        from_contest: fromContest,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const requestGymsAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/api/v2/home/save_request`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getAIConsentAPI = async (clientId) => {
  try {
    const res = await axiosInstance.get(`/client/ai_consent/get`, {
      params: {
        client_id: clientId,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const postAIConsentAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/client/ai_consent/create`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const reportKyraAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/client/ai_reports/create`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const giveStepsConsentAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/client/step_consent/create`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const deleteAccountAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/client/delete_account/create`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getDelete = async (clientId) => {
  try {
    const res = await axiosInstance.get(`/client/delete_account/get`, {
      params: {
        client_id: clientId,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getMaintenenceAPI = async (current_version, platform) => {
  try {
    const res = await axios.get(`${API_URL}/api/v2/app-config/check`, {
      params: {
        app: "fittbot",
        current_version,
        platform,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const editKyraItemsAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/food_scanner/analyse_text`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const modifyFoodItemsAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/food_scanner/modify_items`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getUserType = async (clientId) => {
  try {
    const res = await axiosInstance.get(`/client/new_registration/usertype`, {
      params: {
        client_id: clientId,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const registerUserNew = async (payload) => {
  try {
    const res = await axios.post(
      `${API_URL}/api/v2/client/new_registration/register`,
      payload,
    );

    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const checkScanEligibilityAPI = async ({ lat, lng }) => {
  try {
    const res = await axiosInstance.get(`/api/v2/diet_apis/check_eligibility`, {
      params: {
        client_lat: lat,
        client_lng: lng,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const ageAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/client/new_registration/step/dob`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const heightAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/client/new_registration/step/height`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const goalAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/client/new_registration/step/goal`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const weightAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/client/new_registration/step/weight`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const shapeAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/client/new_registration/step/body-shape`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const lifestyleAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/client/new_registration/step/lifestyle`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

export const getMostCommonAreasAPI = async (
  filter,
  state,
  city,
  area,
  pincode,
  search,
) => {
  try {
    const params = { filter };

    // Add optional filter params if provided
    if (state) params.state = state;
    if (city) params.city = city;
    if (area) params.area = area;
    if (pincode) params.pincode = pincode;
    if (search) params.search = search;

    const res = await axiosInstance.get(`/gym_studios/most_common`, {
      params,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const checkEditPassAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/get_dailypass/edit/quote`, payload);
    return res?.data;
  } catch (err) {
    return err?.response.data;
  }
};

//--------------------- Reward Program API ---------------------

export const rewardProgramOptInAPI = async (client_id) => {
  try {
    const res = await axiosInstance.post(`/reward_program/opt_in`, {
      client_id,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const checkRewardProgramOptedInAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/reward_program/check_opted_in`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getRewardProgramDashboardAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/reward_program/dashboard`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Feed Interest API ---------------------

export const checkFeedInterestAPI = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/feed/check_interest`, {
      params: {
        client_id,
      },
    });

    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const setFeedInterestAPI = async (client_id) => {
  try {
    const res = await axiosInstance.post(`/feed/set_interest`, { client_id });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Scan Check In QR API ---------------------

export const scanCheckInAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/client_scanning/verify`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Scan Testing In QR API ---------------------

export const scanTestingAPI = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/client_scanning/get_gym_id`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Operating hours in daily pass API ---------------------

export const getOperatingHours = async (gym_id) => {
  try {
    const res = await axiosInstance.get(`/operating_hours/get`, {
      params: {
        gym_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Reward check API ---------------------

export const rewardCheck = async (client_id) => {
  try {
    const res = await axiosInstance.get(`/reward_program/check_opted_in`, {
      params: {
        client_id,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getHomeDataAPI = async (lat, lng) => {
  try {
    const res = await axiosInstance.get(`/api/v2/home/data`, {
      params: {
        client_lat: lat,
        client_lng: lng,
      },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//---------------------Contact Change api ---------------------

export const initiateContactChangeAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/profile/contact/initiate`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const verifyContactChangeAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/profile/contact/verify`,
      payload,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

// --------------------- AI Diet Coach APIs ---------------------

export const generateDietPlanAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/api/v2/chat-diet/generate`, payload);
    return { ...res?.data, httpStatus: res?.status };
  } catch (err) {
    return { ...err?.response?.data, httpStatus: err?.response?.status };
  }
};

export const pollDietPlanStatusAPI = async (jobId) => {
  try {
    const res = await axiosInstance.get(`/api/v2/chat-diet/status/${jobId}`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getDietPlanAPI = async (jobId) => {
  try {
    const res = await axiosInstance.get(`/api/v2/chat-diet/plan/${jobId}`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getCurrentDietPlanAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/chat-diet/current`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const generateFollowupAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/chat-diet/followup/generate`,
      payload,
    );
    return { ...res?.data, httpStatus: res?.status };
  } catch (err) {
    return { ...err?.response?.data, httpStatus: err?.response?.status };
  }
};

export const swapMealAPI = async (planId, payload) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/chat-diet/plans/${planId}/swap`,
      payload,
    );
    return { ...res?.data, httpStatus: res?.status };
  } catch (err) {
    return { ...err?.response?.data, httpStatus: err?.response?.status };
  }
};

//---------------------iPhone Nutrition Interest API ---------------------

export const iphoneNutritionAPI = async (type) => {
  try {
    const res = await axiosInstance.post(`/api/v2/home/iphone_nutrition`, {
      type,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//---------------------Webinar Registration API ---------------------

export const checkRewardOptedInAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/reward_program/opted_in`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const postponeRewardAPI = async () => {
  try {
    const res = await axiosInstance.post(`/api/v2/home/postpone_reward`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const webinarRegisterAPI = async () => {
  try {
    const res = await axiosInstance.post(`/api/v2/webinar/app_register`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Gym Mate Profile APIs ---------------------

export const getGymMateProfileAPI = async (view, client_id) => {
  try {
    const params = { view };
    if (client_id) params.client_id = client_id;
    const res = await axiosInstance.get(`/api/v2/gym_mate/profile/me`, {
      params,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const updateGymMateProfileAPI = async (payload) => {
  try {
    const res = await axiosInstance.put(`/api/v2/gym_mate/profile/me`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const presignGymMatePhotoAPI = async (slots) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/profile/photos/presign`,
      { slots },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const presignStoryAPI = async (content_type) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/stories/media/presign`,
      { content_type },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const publishStoryAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/api/v2/gym_mate/stories`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const createGymMateSessionAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/api/v2/gym_mate/sessions`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getNearbySessionsAPI = async (lat, lng, limit = 100) => {
  try {
    const res = await axiosInstance.get(`/api/v2/gym_mate/sessions/nearby`, {
      params: { lat, lng, limit },
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const sendSessionRequestAPI = async (session_id) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/sessions/${session_id}/requests`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Gym Mate Block / Unblock APIs ---------------------

export const blockGymMateUserAPI = async (blocked_client_id) => {
  try {
    const res = await axiosInstance.post(`/api/v2/gym_mate/blocks`, {
      blocked_client_id,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const unblockGymMateUserAPI = async (client_id) => {
  try {
    const res = await axiosInstance.delete(
      `/api/v2/gym_mate/blocks/${client_id}`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getBlockedGymMateUsersAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/gym_mate/blocks`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Gym Mate Friends API ---------------------

export const getMyFriendsAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/gym_mate/friends`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const unfriendAPI = async (other_client_id) => {
  try {
    const res = await axiosInstance.delete(
      `/api/v2/gym_mate/friends/${other_client_id}`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getSessionRequestsReceivedAPI = async () => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/gym_mate/sessions/me/received`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getSessionRequestsSentAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/gym_mate/sessions/me/sent`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getSessionMatchesAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/gym_mate/sessions/me/matches`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getFriendSuggestionsAPI = async (limit = 30, offset = 0) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/gym_mate/friends/suggestions`,
      { params: { limit, offset } },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Gym Mate Friend Requests API ---------------------

export const sendFriendRequestAPI = async (to_client_id) => {
  try {
    const res = await axiosInstance.post(`/api/v2/gym_mate/friends/requests`, {
      to_client_id,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getIncomingFriendRequestsAPI = async () => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/gym_mate/friends/requests/incoming`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getOutgoingFriendRequestsAPI = async () => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/gym_mate/friends/requests/outgoing`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const acceptFriendRequestAPI = async (request_id) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/friends/requests/${request_id}/accept`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const rejectFriendRequestAPI = async (request_id) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/friends/requests/${request_id}/reject`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const cancelFriendRequestAPI = async (request_id) => {
  try {
    const res = await axiosInstance.delete(
      `/api/v2/gym_mate/friends/requests/${request_id}`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Gym Mate Session Request Actions API ---------------------

export const acceptSessionRequestAPI = async (request_id) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/sessions/requests/${request_id}/accept`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const rejectSessionRequestAPI = async (request_id) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/sessions/requests/${request_id}/reject`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const withdrawSessionRequestAPI = async (request_id) => {
  try {
    const res = await axiosInstance.delete(
      `/api/v2/gym_mate/sessions/requests/${request_id}`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Gym Mate Hosted Sessions API ---------------------

export const getHostedSessionsAPI = async () => {
  try {
    const res = await axiosInstance.get(`/api/v2/gym_mate/sessions/me/hosted`);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const getSessionParticipantsAPI = async (session_id) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/gym_mate/sessions/${session_id}/participants`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Gym Mate Report API ---------------------

export const reportGymMateEntityAPI = async (payload) => {
  try {
    const res = await axiosInstance.post(`/api/v2/gym_mate/reports`, payload);
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

//--------------------- Gym Mate Chat API ---------------------

export const fetchChatInboxAPI = async (opts = {}) => {
  try {
    const params = { limit: opts.limit ?? 30 };
    if (opts.before_at) params.before_at = opts.before_at;
    const res = await axiosInstance.get(`/api/v2/gym_mate/chat/rooms`, {
      params,
    });
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const markChatRoomReadAPI = async (room_id, up_to_message_id) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/chat/rooms/${room_id}/read`,
      { up_to_message_id },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const fetchChatHistoryAPI = async (room_id, opts = {}) => {
  try {
    const params = { limit: opts.limit ?? 40 };
    if (opts.before) params.before = opts.before;
    const res = await axiosInstance.get(
      `/api/v2/gym_mate/chat/rooms/${room_id}/messages`,
      { params },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const sendChatMessageAPI = async (room_id, body, client_msg_id) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/chat/rooms/${room_id}/messages`,
      { body, client_msg_id },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const openDirectRoomAPI = async (peer_client_id, session_id = null) => {
  try {
    const body = { peer_client_id };
    if (session_id != null) body.session_id = session_id;
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/chat/rooms/direct`,
      body,
    );
    return { status: res?.status, data: res?.data };
  } catch (err) {
    return err?.response?.data;
  }
};

export const openSessionGroupRoomAPI = async (session_id) => {
  try {
    const res = await axiosInstance.get(
      `/api/v2/gym_mate/chat/rooms/session/${session_id}`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const deleteChatMessagesAPI = async (messageIds) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/chat/messages/delete`,
      { message_ids: messageIds },
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const leaveChatRoomAPI = async (roomId) => {
  try {
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/chat/rooms/${roomId}/leave`,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};

export const reportChatRoomAPI = async (roomId, reason, details = null) => {
  try {
    const body = { reason };
    if (details) body.details = details;
    const res = await axiosInstance.post(
      `/api/v2/gym_mate/chat/rooms/${roomId}/report`,
      body,
    );
    return res?.data;
  } catch (err) {
    return err?.response?.data;
  }
};
