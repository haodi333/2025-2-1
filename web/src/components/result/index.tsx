import { DownloadOutlined } from "@ant-design/icons";
import { Button, Card, Col, Flex, message } from "antd";
import Chart from "../chart";
import "./index.css";
import Search from "antd/es/input/Search";
import { useAppSelector } from "../../store/hooks";
import JSZip from "jszip";
import { download, downloadBlob } from "../../utils/download";
import { memo, useEffect, useState } from "react";

const { Meta } = Card;

interface CardItemProps {
	url: string;
	title?: string;
	description?: string;
	className?: string;
}

const CardItem = memo(({ title, description, className, url }: CardItemProps) => {
	const data = useAppSelector((state) => state.data.dataList[url]?.data);
	if (!data) return null;

	return (
		<Card
			className={className}
			cover={
				<>
					{Object.entries(data).map(([key, value]) => (
						<Chart
							key={key}
							height={100}
							title={key}
							xData={Array.from({ length: value.length }, (_, k) => k)}
							yData={value as number[]}
							isXAxisVisible={true}
							isYAxisVisible={true}
							isFill={true}
						></Chart>
					))}
				</>
			}
			actions={[
				<DownloadOutlined
					key="download"
					onClick={() => {
						download(url, title ?? "data");
					}}
				/>,
			]}
		>
			<Meta
				title={title}
				description={description}
			/>
		</Card>
	);
});

const Result = () => {
	const urlList = useAppSelector((state) => state.data.urlList);
	const [urls, setUrls] = useState<string[]>([...urlList]);
	const dataList = useAppSelector((state) => state.data.dataList);
	const [count, setCount] = useState(0);

	useEffect(() => {
		setUrls([...urlList]);
	}, [urlList]);

	useEffect(() => {
		setCount(0);
		const timer = setInterval(() => {
			setCount((prev) => {
				if (prev >= urls.length) {
					return urls.length;
				}
				return prev + 2;
			});
		}, 16);
		return () => {
			clearInterval(timer);
		};
	}, [urls.length]);

	const onSearch = (val: string) => {
		setUrls(
			Object.values(dataList)
				.filter((item) => item.name.includes(val) || item.description?.includes(val))
				.map((item) => item.url)
		);
	};

	const downloadFiles = () => {
		if (urls.length > 1) {
			const zip = new JSZip();
			Promise.allSettled(
				urls.map((url) =>
					fetch(url)
						.then((res) => res.blob())
						.then((blob) => zip.file(dataList[url].name, blob))
				)
			)
				.then(() => {
					zip.generateAsync({ type: "blob" }).then((content) => {
						downloadBlob(content, "file.zip");
					});
				})
				.catch((err) => {
					message.error(`下载失败：${err.message}`);
				});
		} else {
			urls.forEach((url) => download(url, dataList[url].name));
		}
	};

	return (
		<div className="result-container">
			<Flex
				gap={12}
				style={{ position: "sticky", top: 0, zIndex: 1 }}
			>
				<Col flex={1}>
					<Search
						placeholder="输入查询文件名或文件描述"
						onSearch={onSearch}
						enterButton
					/>
				</Col>
				<Col>
					<Button
						disabled={!urls.length}
						onClick={downloadFiles}
						type="primary"
						icon={<DownloadOutlined></DownloadOutlined>}
					>
						全部下载
					</Button>
				</Col>
			</Flex>
			<div className="result">
				<div className="card-list">
					{urls.slice(0, count).map((url) => {
						return (
							<CardItem
								key={url}
								title={dataList[url]?.name}
								description={dataList[url]?.description ? "样品编号：" + dataList[url]?.description : ""}
								url={url}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default Result;
