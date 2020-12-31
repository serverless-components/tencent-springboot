const CONFIGS = {
  templateUrl:
    'https://serverless-templates-1300862921.cos.ap-beijing.myqcloud.com/springboot-demo.zip',
  compName: 'springboot',
  compFullname: 'SpringBoot',
  projectJarName: 'my-springboot.jar',
  handler: 'example.MyHandler::mainHandler',
  runtime: 'Java8',
  timeout: 30,
  memorySize: 256,
  namespace: 'default',
  description: 'Created by Serverless Component'
}

module.exports = CONFIGS
