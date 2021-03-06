import * as path from "path";
import * as fs from "fs";
import * as qiniu from "qiniu";
import * as request from "request";
//@ts-ignore
import Agent from 'socks5-http-client/lib/Agent';

type UploadConfig = {
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
const fileDisplay = (
	filePath: string,
	callback: (fp: string, uploadConfig: UploadConfig) => any,
	uploadConfig: UploadConfig
) => {
	//根据文件路径读取文件，返回文件列表
	fs.readdir(filePath, function (err, files) {
		if (err) {
			console.warn(err);
		} else {
			//遍历读取到的文件列表
			files.forEach(function (filename) {
				//获取当前文件的绝对路径
				const filedir = path.join(filePath, filename);
				//根据文件路径获取文件信息，返回一个fs.Stats对象
				fs.stat(filedir, function (eror, stats) {
					if (eror) {
						console.warn("获取文件stats失败");
					} else {
						const isFile = stats.isFile(); //是文件
						const isDir = stats.isDirectory(); //是文件夹
						if (isFile) {
							if (path.extname(filedir).toLowerCase() == ".md") {
								console.info("正在处理：", filedir);
								callback(filedir, uploadConfig);
							}
						}
						if (isDir) {
							fileDisplay(filedir, callback, uploadConfig); //递归，如果是文件夹，就继续遍历该文件夹下面的文件
						}
					}
				});
			});
		}
	});
};

/**
 * 替换本地图片
 * @param data 文本数据
 * @param callback 传入正则匹配结果的回调函数
 */
const replaceLocalUrl = (data: string, callback: (result: any[]) => any) => {
	const patt = /\!\[.*\]\(((?!(http|https)\:\/\/).+(\.png|\.jpg|\.gif))\)/g;
	const result = patt.exec(data);
	if (result == null) {
		return;
	}
	callback(result);
};


/**
 * 替换图片链接
 * @param articlePath 文章文件路径
 * @param uploadConfig 配置
 */
const replaceUrl = (articlePath: string, uploadConfig: UploadConfig) => {
	fs.readFile(articlePath, "utf8", function (err, data) {

		if (uploadConfig.replaceNetworkImage) {
			// 替换所有非七牛图床的图片

			const patt = new RegExp("\\!\\[.*\\]\\(((?!"+uploadConfig.domain+").+)\\)","g");
			const result = patt.exec(data);

			if (result == null ) {

				return;
			}
			if(result[1].indexOf("http")!==0){
				// 替换本地图片
				replaceLocalUrl(data, (result) => {
					upload(articlePath, data, result, uploadConfig);
				});
			}else{
				// 替换网络图片
				const filename = result[1].substring(result[1].lastIndexOf("/") + 1);
				request(result[1]).pipe(fs.createWriteStream(filename)).on('error',function(){
					console.log("下载失败",result[1])
					fs.unlink(filename, () => {});
				}).on('close',function () {
					upload(articlePath, data, result, uploadConfig, true);
				})
			}


		}else{
			// 替换本地图片
			replaceLocalUrl(data, (result) => {
				upload(articlePath, data, result, uploadConfig);
			});
		}
		

	});
};

/**
 * 上传到七牛
 * @param articlePath 文章路径
 * @param article 文章内容
 * @param reResult 匹配结果
 * @param uploadConfig 上传配置
 */
const upload = (
	articlePath: string,
	article: string,
	reResult: any[],
	uploadConfig: UploadConfig,
	networkImage: boolean = false
) => {
	const { AK, SK, bucket, domain, zone } = uploadConfig;
	const mac = new qiniu.auth.digest.Mac(AK, SK);
	const options = {
		scope: bucket,
	};
	// 图片地址
	let filePath = networkImage
		? reResult[1].substring(reResult[1].lastIndexOf("/") + 1)
		: reResult[1];
	const putPolicy = new qiniu.rs.PutPolicy(options);
	const uploadToken = putPolicy.uploadToken(mac);
	let config = new qiniu.conf.Config();
	// 空间对应的机房
	switch (zone) {
		case "华东":
			//@ts-ignore
			config.zone = qiniu.zone.Zone_z0;
			break;
		case "华北":
			//@ts-ignore
			config.zone = qiniu.zone.Zone_z1;
			break;
		case "华南":
			//@ts-ignore
			config.zone = qiniu.zone.Zone_z2;
			break;
		case "北美":
			//@ts-ignore
			config.zone = qiniu.zone.Zone_na0;
			break;
		case "东南亚":
			//@ts-ignore
			config.zone = qiniu.zone.Zone_as0;
			break;
	}
	const formUploader = new qiniu.form_up.FormUploader(config);
	const putExtra = new qiniu.form_up.PutExtra();
	const temp = filePath.replace(/\\/g,'/').split('/')
	let key = temp[temp.length - 1]
	key = key.replace(/\s/g,'')
	// 文件上传
	formUploader.putFile(uploadToken, key,filePath, putExtra, function (
		respErr,
		respBody,
		respInfo
	) {
		if (respErr) {
			throw respErr;
		}
		if (respInfo.statusCode == 200) {

			let imgUrl = "";
			if (domain[domain.length - 1] !== "/") {
				imgUrl = domain + "/" + respBody.key;
			} else {
				imgUrl = domain + respBody.key;
			}
			// 获取更新后的markdown图片文本
			const mdImgBlock = reResult[0].replace(reResult[1], imgUrl);
			// 替换文章中的图片文本
			article = article.replace(reResult[0], mdImgBlock);
			// 将更新后的文章覆盖写入文件中
			fs.writeFile(articlePath, article, function (err) {
				if (networkImage) {
					// 删除缓存文件
					fs.unlink(filePath, () => {});
				}
				if (err) {
					throw err;
				}
				// 继续检查该文件是否还存在本地图片
				replaceUrl(articlePath, uploadConfig);
			});

			return imgUrl;
		} else {
			console.error(respInfo.statusCode);
			console.error(respBody);
		}
	});
};

export { fileDisplay, upload, replaceUrl };
