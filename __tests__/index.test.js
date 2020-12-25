const { join } = require('path')
require('dotenv').config({ path: join(__dirname, '.env.test') })

const { generateId, getServerlessSdk } = require('./lib/utils')
const path = require('path')
// const axios = require('axios')

const instanceYaml = {
  org: 'orgDemo',
  app: 'appDemo',
  component: 'springboot@dev',
  name: `springboot-integration-tests-${generateId()}`,
  stage: 'dev',
  inputs: {
    runtime: 'Java8',
    region: 'ap-shanghai',
    apigatewayConf: { environment: 'test' }
  }
}

const credentials = {
  tencent: {
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY
  }
}

const sdk = getServerlessSdk(instanceYaml.org)

it('should successfully deploy springboot app', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials)

  expect(instance).toBeDefined()
  expect(instance.instanceName).toEqual(instanceYaml.name)
  expect(instance.outputs.templateUrl).toBeDefined()
  expect(instance.outputs.region).toEqual(instanceYaml.inputs.region)
  expect(instance.outputs.apigw).toBeDefined()
  expect(instance.outputs.apigw.environment).toEqual(instanceYaml.inputs.apigatewayConf.environment)
  expect(instance.outputs.scf).toBeDefined()
  expect(instance.outputs.scf.runtime).toEqual(instanceYaml.inputs.runtime)
})

it('should successfully update source code', async () => {
  // change source to own source './'
  const srcPath = path.join(__dirname, '..', 'example')
  instanceYaml.inputs.src = srcPath
  instanceYaml.inputs.projectJarName = 'my-springboot.jar'

  const instance = await sdk.deploy(instanceYaml, credentials)
  // clod boot always cause 503 timeout
  // const response = await axios.get(instance.outputs.apigw.url)
  // expect(response.data.includes('Spring Boot')).toBeTruthy()
  expect(instance.outputs.templateUrl).not.toBeDefined()
})

it('should successfully remove springboot app', async () => {
  await sdk.remove(instanceYaml, credentials)
  result = await sdk.getInstance(
    instanceYaml.org,
    instanceYaml.stage,
    instanceYaml.app,
    instanceYaml.name
  )

  expect(result.instance.instanceStatus).toEqual('inactive')
})
