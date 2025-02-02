import { configureStore } from "@reduxjs/toolkit";
import { dataSlice } from "./slice/data-slice";

const store = configureStore({
  reducer: {
    data: dataSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
