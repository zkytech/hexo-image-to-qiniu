const { replaceUrl, fileDisplay } = require("./dist/util");
let uploadConfig = hexo.config.localImageToQiniu;
const defaultConfig = {
	activate: true,
	replaceNetworkImage: false,
};

uploadConfig = { ...defaultConfig, ...uploadConfig };

requiredProperties = ["AK", "SK", "bucket", "domain", "zone"];

hexo.extend.console.register(
	'imgtoqiniu',
	'auto replace your images with qiniu',
	function(){
		if (uploadConfig.activate) {
			let configOK = true;
			console.log("start processing")
			requiredProperties.forEach((prop) => {
				if (uploadConfig[prop] == undefined) {
					console.error(
						"\033[41;30mERROR \033[40;31m 请在hexo配置文件中设置 localImageToQiniu." +
						prop +
						" \033[0m"
					);
					configOK = false;
				}
			});
			if (configOK) {

				fileDisplay("./source", replaceUrl, uploadConfig);


			}
		}
	}
  );



