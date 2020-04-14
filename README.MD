运行 `hexo imgtoqiniu`时自动将 markdown 文件中的图片替换为七牛链接

需要在 hexo 配置中增加以下内容:

```yml
localImageToQiniu:
    activate: true # 是否启用
    AK: # AccessKey
    SK: # SecretKey
    bucket: # 对象存储空间名称
    domain: # 绑定的域名，必须添加http或https开头。
    zone: # 机房位置，华东、华北、华南、北美、东南亚
    replaceNetworkImage:false # 是否替换网络图片（对所有非设定域名内的网络图片进行替换）由于有些图片做了反爬，这个功能目前比较鸡肋。
```
