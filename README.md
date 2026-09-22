# 抬头啦 · 课堂观察 PWA

面向安卓手机、50–80人普通教室的可安装原型。它统计三类可解释指标：到课率、面向教学区比例、识别覆盖率。原始视频不上传，数据保存在浏览器本地。

在线版本：<https://zyouqd-design.github.io/taitoula-classroom/>

## 安装与运行

PWA 的摄像头和安装功能要求 HTTPS（本机 localhost 调试除外）。把整个文件夹部署到任意 HTTPS 静态站点后，用安卓 Chrome 打开，点击页面右上角“安装”，或使用浏览器菜单“添加到主屏幕”。

本地预览：

```bash
python3 -m http.server 8080 --directory look-up-classroom
```

然后访问 `http://localhost:8080`。

## 第一版已有功能

- 默认60人课程与8列座位热图
- 安卓后置摄像头调用，优先请求4K画面
- 浏览器支持 FaceDetector 时，本地检测最多80张人脸
- 演示模式：无需相机即可体验动态统计
- 到课率、面向教学区比例、识别覆盖率实时显示
- 报告保存到 localStorage，并导出 UTF-8 CSV
- Service Worker 离线缓存与 PWA 安装清单
- 隐私与评价边界提示

## 当前原型边界

1. 当前真实模式依赖 Chrome 的 FaceDetector 支持；不支持时仅作为机位画面测试。
2. 原型采用“按画面位置映射座位”，没有保存人脸特征。正式版可加入经授权的人脸嵌入模型。
3. 仅靠普通人脸框无法可靠判断 pitch/yaw；当前真实模式把已检测人脸视为面向前方。正式版需加入 Face Landmarker/Head Pose 模型。
4. 单机位能否覆盖80人取决于后排脸部像素。正式统计前应先跑5分钟，以识别覆盖率不低于75%为最低条件。
5. 不应把该指标称为“注意力”，也不建议直接用于处分、教师排名或单次课堂评价。

## 建议的原生 Android v2

- CameraX 4K帧采样
- MediaPipe Face Detector + Face Landmarker
- 可选 MobileFaceNet/ArcFace 本地身份匹配
- Room 数据库与加密人脸模板
- 双机位局域网合并（大教室）
- 课件时间点标记、提问标记与课堂曲线联动
- 自动生成 Excel/PDF 课堂反馈报告
