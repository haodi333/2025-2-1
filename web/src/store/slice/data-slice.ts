import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Data {
  name: string;
  url: string;
  description?: string;
  data: [number[], number[]];
}

interface DataState {
  urlList: string[];
  dataList: Record<string, Data>;
}

const initialState: DataState = {
  urlList: [],
  dataList: {},
};

export const dataSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    setUrlList: (state, action: PayloadAction<string[]>) => {
      state.urlList = action.payload;
    },
    setDataList: (state, action: PayloadAction<Record<string, Data>>) => {
      Object.assign(state.dataList, action.payload);
    },
    addDataList: (state, action: PayloadAction<Data>) => {
      state.dataList[action.payload.url] = action.payload;
    },
  },
});

export const { setUrlList, setDataList, addDataList } = dataSlice.actions;

export default dataSlice.reducer;
