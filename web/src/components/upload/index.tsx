import React, { useState } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import type { GetProp, UploadProps } from 'antd';
import { Button, message, Upload } from 'antd';
import './index.css';
import { flushSync } from 'react-dom';
import { useAppDispatch } from '../../store/hooks';
import { setDataList, setUrlList } from '../../store/slice/data-slice';
import { parseCsv, parseZip } from '../../utils/csv';
import { upload } from '../../api';
import { transpose } from '../../utils/transpose';

const { Dragger } = Upload;
export type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

const UploadComponent: React.FC = () => {
    const [fileList, setFileList] = useState<FileType[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const dispatch = useAppDispatch();

    const handleUpload = async () => {
        setIsUploading(true);
        dispatch(setDataList({}));
        dispatch(setUrlList([]));
        const formData = new FormData();
        fileList.forEach((file) => {
            formData.append('files', file);
        });
        upload(formData).then((res) => {
            setFileList([]);
            message.success('upload successfully.');
            parseZip(res).then(files => {
                const urlList = files.map(file => URL.createObjectURL(file));
                dispatch(setUrlList(urlList));
                Promise.all(files.map(file => parseCsv(file))).then(data => {
                    dispatch(setDataList(Object.fromEntries(data.map((d, index) => {
                        const allData = Object.values(d);
                        const description = allData[1][0] as string;
                        const data = allData.slice(4);
                        return ([urlList[index], { name: files[index].name, description, data: transpose(data) as [number[], number[]], url: urlList[index] }])
                    }))));
                })
            })
        }).catch(() => {
            message.error('upload failed.');
        }).finally(() => {
            setIsUploading(false);
        });
    };

    const beforeUpload = (file: FileType) => {
        const isZip = file.name.endsWith('.zip');
        if (isZip) {
            parseZip(file).then((files) => {
                setFileList((prev) => [...prev, ...files.map((file) => file as unknown as FileType)])
            });
            return false;
        }
        const isCsv = file.type === 'text/csv';
        if (isCsv) {
            flushSync(() => setFileList([...fileList, file]));
            return false;
        }
        message.error(`${file.name} is not a supported file`);
        return false;
    };

    const props: UploadProps = {
        name: 'file',
        multiple: true,
        accept: '.csv,.zip',
        fileList,
        beforeUpload,
        onRemove: (file) => {
            setFileList(fileList.filter(f => f !== file));
        },
    };

    return (
        <div className='upload-container'>
            <Dragger {...props}>
                <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click or drag csv/zip file to this area to upload</p>
            </Dragger>
            <Button
                type="primary"
                onClick={handleUpload}
                disabled={fileList.length === 0}
                loading={isUploading}
                style={{ marginTop: 16, width: '100%' }}
            >
                {isUploading ? 'Uploading' : 'Upload'}
            </Button>
        </div>
    );
};

export default UploadComponent;
