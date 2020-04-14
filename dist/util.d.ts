declare type UploadConfig = {
    activate: boolean;
    AK: string;
    SK: string;
    bucket: string;
    domain: string;
    zone: "华东" | "华北" | "华南" | "北美" | "东南亚";
    replaceNetworkImage: boolean;
};
/**
 * 文件遍历方法
 * @param filePath 需要遍历的文件夹
 * @param callback 遍历到文件的回调函数
 * @param uploadConfig 上传配置
 */
declare const fileDisplay: (filePath: string, callback: (fp: string, uploadConfig: UploadConfig) => any, uploadConfig: UploadConfig) => void;
/**
 * 替换图片链接
 * @param articlePath 文章文件路径
 * @param uploadConfig 配置
 */
declare const replaceUrl: (articlePath: string, uploadConfig: UploadConfig) => void;
/**
 * 上传到七牛
 * @param articlePath 文章路径
 * @param article 文章内容
 * @param reResult 匹配结果
 * @param uploadConfig 上传配置
 */
declare const upload: (articlePath: string, article: string, reResult: any[], uploadConfig: UploadConfig, networkImage?: boolean) => void;
export { fileDisplay, upload, replaceUrl };
