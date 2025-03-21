import React, { useState } from "react";
import { InboxOutlined, SwapRightOutlined } from "@ant-design/icons";
import type { GetProp, UploadProps } from "antd";
import { Button, Flex, InputNumber, message, Upload } from "antd";
import "./index.css";
import { flushSync } from "react-dom";
import { useAppDispatch } from "../../store/hooks";
import { setDataList, setUrlList } from "../../store/slice/data-slice";
import { parseCsv, parseZip } from "../../utils/csv";
import { upload } from "../../api";

const { Dragger } = Upload;
export type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

const UploadComponent: React.FC = () => {
	const [fileList, setFileList] = useState<FileType[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [targetMin, setTargetMin] = useState<number | null>(null);
	const [targetMax, setTargetMax] = useState<number | null>(null);
	const dispatch = useAppDispatch();

	const handleUpload = async () => {
		setIsUploading(true);
		dispatch(setDataList({}));
		dispatch(setUrlList([]));
		const formData = new FormData();
		fileList.forEach((file) => {
			formData.append("files", file);
		});
		upload(formData, targetMin, targetMax)
			.then((res) => {
				setFileList([]);
				message.success("上传成功");
				parseZip(res).then((files) => {
					const urlList = files.map((file) => URL.createObjectURL(file));
					dispatch(setUrlList(urlList));
					Promise.all(files.map((file) => parseCsv(file))).then((data) => {
						dispatch(
							setDataList(
								Object.fromEntries(
									data.map((d, index) => {
										return [urlList[index], { name: files[index].name, description: "", data: d, url: urlList[index] }];
									})
								)
							)
						);
					});
				});
			})
			.catch((err) => {
				message.error(`上传失败：${err.message}`);
			})
			.finally(() => {
				setIsUploading(false);
			});
	};

	const beforeUpload = (file: FileType) => {
		const isZip = file.name.endsWith(".zip");
		if (isZip) {
			parseZip(file).then((files) => {
				setFileList((prev) => [...prev, ...files.map((file) => file as unknown as FileType)]);
			});
			return false;
		}
		const isCsv = file.type === "text/csv";
		if (isCsv) {
			flushSync(() => setFileList([...fileList, file]));
			return false;
		}
		message.error(`${file.name} 不是一个支持的文件类型`);
		return false;
	};

	const props: UploadProps = {
		name: "file",
		multiple: true,
		accept: ".csv,.zip",
		fileList,
		beforeUpload,
		onRemove: (file) => {
			setFileList(fileList.filter((f) => f !== file));
		},
	};

	return (
		<div className="upload-container">
			<Dragger {...props}>
				<p className="ant-upload-drag-icon">
					<InboxOutlined />
				</p>
				<p className="ant-upload-text">点击或拖拽 csv/zip 文件到此处上传</p>
			</Dragger>
			<Flex
				justify="center"
				align="center"
				style={{ marginTop: 16 }}
				gap={16}
			>
				<InputNumber
					value={targetMin}
					onChange={(value) => setTargetMin(value)}
					addonBefore="最小值"
				/>
				<SwapRightOutlined />
				<InputNumber
					value={targetMax}
					onChange={(value) => setTargetMax(value)}
					addonBefore="最大值"
				/>
			</Flex>
			<Button
				type="primary"
				onClick={handleUpload}
				disabled={fileList.length === 0}
				loading={isUploading}
				style={{ marginTop: 16, width: "100%" }}
			>
				{isUploading ? "上传中" : "上传"}
			</Button>
		</div>
	);
};

export default UploadComponent;
