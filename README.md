[![Serverless Components](https://main.qcloudimg.com/raw/ee412a92d931554cea5f626838c5170f.png)](http://serverless.com)

</br>

**腾讯云 SpringBoot 组件** ⎯⎯⎯ 通过使用 [Tencent Serverless Framework](https://github.com/serverless/components/tree/cloud)，基于云上 Serverless 服务（如网关、云函数等），实现“0”配置，便捷开发，极速部署你的 SpringBoot 应用，SpringBoot 组件支持丰富的配置扩展，提供了目前最易用、低成本并且弹性伸缩的 SpringBoot 项目开发/托管能力。

</br>

特性介绍：

- [x] **按需付费** - 按照请求的使用量进行收费，没有请求时无需付费
- [x] **"0"配置** - 只需要关心项目代码，之后部署即可，Serverless Framework 会搞定所有配置。
- [x] **极速部署** - 仅需几秒，部署你的整个 SpringBoot 应用。
- [x] **实时日志** - 通过实时日志的输出查看业务状态，便于直接在云端开发应用。
- [x] **便捷协作** - 通过云端的状态信息和部署日志，方便的进行多人协作开发。
- [x] **自定义域名** - 支持配置自定义域名及 HTTPS 访问

<br/>

快速开始：

1. [**安装**](#1-安装)
2. [**创建**](#2-创建)
3. [**部署**](#3-部署)
4. [**配置**](#4-配置)
5. [**开发调试**](#5-开发调试)
6. [**查看状态**](#6-查看状态)
7. [**移除**](#7-移除)

更多资源：

- [**架构说明**](#架构说明)
- [**账号配置**](#账号配置)

&nbsp;

### 1. 安装

通过 npm 安装最新版本的 Serverless Framework

```bash
$ npm install -g serverless
```

### 2. 创建

通过如下命令和模板链接，快速创建一个 SpringBoot 应用：

```bash
$ serverless init springboot-starter --name example
$ cd example
```

### 3. 部署

在 `serverless.yml` 文件所在的项目根目录，运行以下指令进行部署：

```bash
$ serverless deploy
```

部署时需要进行身份验证，如您的账号未 [登陆](https://cloud.tencent.com/login) 或 [注册](https://cloud.tencent.com/register) 腾讯云，您可以直接通过 `微信` 扫描命令行中的二维码进行授权登陆和注册。

> 注意: 如果希望查看更多部署过程的信息，可以通过`serverless deploy --debug` 命令查看部署过程中的实时日志信息。

> **说明**：如果鉴权失败，请参考 [权限配置](https://cloud.tencent.com/document/product/1154/43006) 进行授权。

### 4. 配置

SpringBoot 组件支持 0 配置部署，也就是可以直接通过配置文件中的默认值进行部署。但你依然可以修改更多可选配置来进一步开发该 SpringBoot 项目。

以下是 SpringBoot 组件的 `serverless.yml`配置示例：

```yml
# serverless.yml

component: springboot # (required) name of the component. In that case, it's springboot.
name: springbootDemo # (required) name of your springboot component instance.
org: orgDemo # (optional) serverless dashboard org. default is the first org you created during signup.
app: appDemo # (optional) serverless dashboard app. default is the same as the name property.
stage: dev # (optional) serverless dashboard stage. default is dev.

inputs:
  src: ./ # path to the source folder. default is a hello world app.
  functionName: springbootDemo
  region: ap-guangzhou
  runtime: Java8 # (optional) only Java8 is currently available
  projectJarName: 'my-springboot.jar' # application jar file name
  functionConfig:
    handler: 'example.MyHandler::mainHandler' # app entry execute file & main function name
    timeout: 30 # (optional) Java app needs to be set for more than 25 seconds
    memorySize: 256 # (optional) Java app usually require a larger memory size
  apigatewayConf:
    protocols:
      - http
      - https
    environment: release
```

点此查看[全量配置及配置说明](https://github.com/serverless-components/tencent-springboot/tree/master/docs/configure.md)

当你根据该配置文件更新配置字段后，再次运行 `serverless deploy` 或者 `serverless` 就可以更新配置到云端。

**若使用自己的 SpringBoot 项目代码进行部署需要进行如下的改造**

1. 在项目 `pom.xml` 中新增腾讯云函数（需为 0.0.4 版本）和 fastjson 的依赖（若自身项目有所用版本可不修改，若无则请依赖最新版本）。

```
<dependency>
    <groupId>com.tencentcloudapi</groupId>
    <artifactId>scf-java-events</artifactId>
    <version>0.0.4</version>
</dependency>

<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>fastjson</artifactId>
    <version>1.2.73</version>
</dependency>
```

2. 在项目的根目录的 `src/main/java` 的任意目录下新增一个执行方法入口，例如：在 src/main/java/example 目录下新建 MyHandler.java 文件。
   如果需要自定义响应数据转换成 Base64 的指定 MediaType 请复写 `getBinaryTypes` 方法并返回 MediaType 列表。

```java
package example;

import com.qcloud.scf.runtime.AbstractSpringHandler;

public class MyHandler extends AbstractSpringHandler {

    /*
       自定义需要转换成Base64的MediaType列表，默认为MediaType.ALL
    */
//    @Override
//    public List<MediaType> getBinaryTypes() {
//        return Arrays.asList(MediaType.IMAGE_PNG, MediaType.IMAGE_JPEG);
//    }

    @Override
    public void startApp() {
        System.out.println("start app");
        // 修改为springboot项目的入口主函数，例如: 入口为DemoApplication class下的main函数
        DemoApplication.main(new String[]{""});
    }
}
```

3. 将代码用 Maven 创建 `jar` 部署包或者用 Gradle 创建 zip 部署包。

需要将项目所有的依赖包一起打包，例如使用`Maven`则推荐用`maven-shade-plugin`进行打包，修改`pom.xml`中的`plugin`：

> 若复杂项目下该配置打包无效，请参考完整版配置(注释部分)。[样例代码](https://github.com/serverless-components/tencent-springboot/blob/main/example/my-springboot-sourcecode/pom.xml#L50)

```
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-shade-plugin</artifactId>
    <version>3.1.1</version>
    <configuration>
        <createDependencyReducedPom>false</createDependencyReducedPom>
    </configuration>
    <executions>
        <execution>
            <phase>package</phase>
            <goals>
                <goal>shade</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

- 云函数关于 Maven 部署包的说明：[点此查看](https://cloud.tencent.com/document/product/583/12217)
- 云函数关于 Gradle 部署包的说明：[点此查看](https://cloud.tencent.com/document/product/583/12216)

4. 修改 serverless.yml 文件中的 `projectJarName` 配置为打包后的 .jar/.zip 文件名，.jar/.zip 文件需要放与 serverless.yml 同级。

> 如：使用 Maven 打包后生成了 code.jar 文件，则 projectJarName 为 `code.jar`

5. 修改 serverless.yml 文件中的 `functionConfig` 的 `handler` 配置，格式为 `[package].[class]::mainHandler` 其中 package 为更多层时用 `.` 连接。

> 如：步骤 2 中新建的 MyHandler.java 放在了 src/main/java/example 中，则 handler 为 `example.MyHandler::mainHandler`

### 5. 开发调试

部署了 SpringBoot 应用后，可以通过开发调试能力对该项目进行二次开发，从而开发一个生产应用。在本地修改和更新代码后，不需要每次都运行 `serverless deploy` 命令来反复部署。你可以直接通过 `serverless dev` 命令对本地代码的改动进行检测和自动上传。

可以通过在 `serverless.yml`文件所在的目录下运行 `serverless dev` 命令开启开发调试能力。

`serverless dev` 同时支持实时输出云端日志，每次部署完毕后，对项目进行访问，即可在命令行中实时输出调用日志，便于查看业务情况和排障。

### 6. 查看状态

在`serverless.yml`文件所在的目录下，通过如下命令查看部署状态：

```
$ serverless info
```

### 7. 移除

在`serverless.yml`文件所在的目录下，通过以下命令移除部署的 SpringBoot 服务。移除后该组件会对应删除云上部署时所创建的所有相关资源。

```
$ serverless remove
```

和部署类似，支持通过 `serverless remove --debug` 命令查看移除过程中的实时日志信息。

## 架构说明

SpringBoot 组件将在腾讯云账户中使用到如下 Serverless 服务：

- [x] **API 网关** - API 网关将会接收外部请求并且转发到 SCF 云函数中。
- [x] **SCF 云函数** - 云函数将承载 SpringBoot 应用。
- [x] **CAM 访问控制** - 该组件会创建默认 CAM 角色用于授权访问关联资源。
- [x] **COS 对象存储** - 为确保上传速度和质量，云函数压缩并上传代码时，会默认将代码包存储在特定命名的 COS 桶中。
- [x] **SSL 证书服务** - 如果你在 yaml 文件中配置了 `apigatewayConf.customDomains` 字段，需要做自定义域名绑定并开启 HTTPS 时，也会用到证书管理服务和域名服务。Serverless Framework 会根据已经备案的域名自动申请并配置 SSL 证书。

## 账号配置

当前默认支持 CLI 扫描二维码登录，如您希望配置持久的环境变量/秘钥信息，也可以本地创建 `.env` 文件

```console
$ touch .env # 腾讯云的配置信息
```

在 `.env` 文件中配置腾讯云的 SecretId 和 SecretKey 信息并保存

如果没有腾讯云账号，可以在此[注册新账号](https://cloud.tencent.com/register)。

如果已有腾讯云账号，可以在[API 密钥管理](https://console.cloud.tencent.com/cam/capi)中获取 `SecretId` 和`SecretKey`.

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

## License

MIT License

Copyright (c) 2020 Tencent Cloud, Inc.
