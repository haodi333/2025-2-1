import { DownloadOutlined } from '@ant-design/icons';
import { Button, Card, Col, Flex } from 'antd';
import Chart from '../chart';
import './index.css';
import Search from 'antd/es/input/Search';
import { useAppSelector } from '../../store/hooks';
import JSZip from 'jszip';
import { download, downloadBlob } from '../../utils/download';
import { memo, useEffect, useState } from 'react';

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
        <Card className={className} cover={<><Chart height={100} title="吸光度" xData={Array.from({ length: data[0].length }, (_, k) => k)} yData={data[0]} isXAxisVisible={true} isYAxisVisible={true} isFill={true}></Chart><Chart title="波长" height={100} xData={Array.from({ length: data[0].length }, (_, k) => k)} yData={data[1]} isXAxisVisible={true} isYAxisVisible={true} isFill={true}></Chart></>} actions={[<DownloadOutlined key="download" onClick={() => { download(url, title ?? 'data') }} />]} >
            <Meta title={title} description={description} />
        </Card>
    )
});

const Result = () => {
    const urlList = useAppSelector((state) => state.data.urlList);
    const [urls, setUrls] = useState<string[]>([...urlList]);
    const dataList = useAppSelector((state) => state.data.dataList);
    const [count, setCount] = useState(0);

    useEffect(() => {
        setUrls([...urlList])
    }, [urlList])

    useEffect(() => {
        setCount(0)
        const timer = setInterval(() => {
            setCount((prev) => {
                if (prev >= urls.length) {
                    return urls.length
                }
                return prev + 2
            })
        }, 16)
        return () => {
            clearInterval(timer)
        }
    }, [urls.length])

    const onSearch = (val: string) => {
        setUrls(Object.values(dataList).filter((item) => item.name.includes(val) || item.description?.includes(val)).map((item) => item.url))
    }

    const downloadFiles = async () => {
        if (urlList.length > 1) {
            const zip = new JSZip();
            await Promise.all(urlList.map((url) => fetch(url).then(res => res.blob()).then(blob => zip.file(dataList[url].name, blob))));
            zip.generateAsync({ type: 'blob' }).then((content) => {
                downloadBlob(content, 'file.zip');
            });
        } else {
            urlList.forEach((url) => download(url, dataList[url].name));
        }
    }

    return (
        <div className='result-container'>
            <Flex gap={12} style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <Col flex={1}><Search placeholder="input search file" onSearch={onSearch} enterButton /></Col>
                <Col><Button disabled={!urls.length} onClick={downloadFiles} type="primary" icon={<DownloadOutlined></DownloadOutlined>}>Download All</Button></Col>
            </Flex>
            <div className='result'>
                <div className="card-list">
                    {urls.slice(0, count).map(url => {
                        return <CardItem key={url} title={dataList[url]?.name} description={'样品编号：' + dataList[url]?.description} url={url} />
                    })}
                </div>
            </div>
        </div>
    )
}

export default Result;