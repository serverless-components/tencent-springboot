const path = require('path')
const { Cos } = require('tencent-component-toolkit')
const ensureObject = require('type/object/ensure')
const ensureIterable = require('type/iterable/ensure')
const ensureString = require('type/string/ensure')
const download = require('download')
const { TypeError } = require('tencent-component-toolkit/src/utils/error')
const CONFIGS = require('./config')
const fs = require('fs')
const AdmZip = require('adm-zip')

/*
 * Generates a random id
 */
const generateId = () =>
  Math.random()
    .toString(36)
    .substring(6)

const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

const getType = (obj) => {
  return Object.prototype.toString.call(obj).slice(8, -1)
}

const mergeJson = (sourceJson, targetJson) => {
  Object.entries(sourceJson).forEach(([key, val]) => {
    targetJson[key] = deepClone(val)
  })
  return targetJson
}

const capitalString = (str) => {
  if (str.length < 2) {
    return str.toUpperCase()
  }

  return `${str[0].toUpperCase()}${str.slice(1)}`
}

const getDefaultProtocol = (protocols) => {
  return String(protocols).includes('https') ? 'https' : 'http'
}

const getDefaultFunctionName = () => {
  return `${CONFIGS.compName}_component_${generateId()}`
}

const getDefaultServiceName = () => {
  return 'serverless'
}

const getDefaultServiceDescription = () => {
  return 'Created by Serverless Component'
}

const validateTraffic = (num) => {
  if (getType(num) !== 'Number') {
    throw new TypeError(
      `PARAMETER_${CONFIGS.compName.toUpperCase()}_TRAFFIC`,
      'traffic must be a number'
    )
  }
  if (num < 0 || num > 1) {
    throw new TypeError(
      `PARAMETER_${CONFIGS.compName.toUpperCase()}_TRAFFIC`,
      'traffic must be a number between 0 and 1'
    )
  }
  return true
}

const getCodeZipPath = async (inputs) => {
  console.log(`Packaging ${CONFIGS.compFullname} application...`)

  // unzip source zip file
  let zipPath
  if (!inputs.code.src) {
    // add default template
    const downloadPath = `/tmp/${generateId()}`
    const filename = 'template'

    console.log(`Installing Default ${CONFIGS.compFullname} App...`)
    try {
      await download(CONFIGS.templateUrl, downloadPath, {
        filename: `${filename}.zip`
      })
    } catch (e) {
      throw new TypeError(`DOWNLOAD_TEMPLATE`, 'Download default template failed.')
    }
    zipPath = `${downloadPath}/${filename}.zip`
  } else {
    zipPath = inputs.code.src
  }

  return zipPath
}

const deleteTmpFolder = (path) => {
  let files = []
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path)
    files.forEach(function(file, index) {
      const curPath = path + '/' + file
      if (fs.statSync(curPath).isDirectory()) {
        // recurse
        deleteall(curPath)
      } else {
        // delete file
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}

/**
 * Upload code to COS
 * @param {Component} instance serverless component instance
 * @param {string} appId app id
 * @param {object} credentials credentials
 * @param {object} inputs component inputs parameters
 * @param {string} region region
 */
const uploadCodeToCos = async (instance, appId, credentials, inputs, region) => {
  const bucketName = inputs.code.bucket || `sls-cloudfunction-${region}-code`
  const objectName = inputs.code.object || inputs.projectJarName

  // if set bucket and object not pack code
  if (!inputs.code.bucket || !inputs.code.object) {
    const cos = new Cos(credentials, region)

    if (!inputs.code.bucket) {
      try {
        // create default bucket
        await cos.deploy({
          bucket: bucketName + '-' + appId,
          force: true,
          lifecycle: [
            {
              status: 'Enabled',
              id: 'deleteObject',
              filter: '',
              expiration: { days: '10' },
              abortIncompleteMultipartUpload: { daysAfterInitiation: '10' }
            }
          ]
        })
      } catch (error) {
        if (error && (error.displayMsg || error.message)) {
          console.log(error.displayMsg || error.message)
        }
        throw new TypeError('UPLOAD_CODE', `Create cos bucket ${bucketName + '-' + appId} failed.`)
      }
    }

    // upload code to cos
    if (!inputs.code.object) {
      const zipPath = await getCodeZipPath(inputs)
      var zip = new AdmZip(zipPath)
      var zipEntries = zip.getEntries()
      // unzip code to /tmp/target folder then upload the code jar to cos
      zipEntries.forEach(function(zipEntry) {
        if (zipEntry.isDirectory == false) {
          console.log('target upload folder file name:' + zipEntry.entryName)
          if (zipEntry.entryName === inputs.projectJarName) {
            zip.extractEntryTo(zipEntry.entryName, '/tmp/target', false, true)
          }
        }
      })

      try {
        await cos.upload({
          bucket: bucketName + '-' + appId,
          file: `/tmp/target/${inputs.projectJarName}`
        })
      } catch (error) {
        if (error && (error.displayMsg || error.message)) {
          console.log(error.displayMsg || error.message)
        }
        throw new TypeError('UPLOAD_CODE', 'Upload code to user cos failed.')
      }

      // remove all files under the /tmp/target folder
      deleteTmpFolder('/tmp/target')
    }
  }

  // save bucket state
  instance.state.bucket = bucketName
  instance.state.object = objectName

  return { bucket: bucketName, object: objectName }
}

const prepareInputs = async (instance, credentials, inputs = {}) => {
  // 对function inputs进行标准化
  const tempFunctionConf = inputs.functionConf
    ? inputs.functionConf
    : inputs.functionConfig
    ? inputs.functionConfig
    : {}
  const fromClientRemark = `tencent-${CONFIGS.compName}`
  const regionList = inputs.region
    ? typeof inputs.region == 'string'
      ? [inputs.region]
      : inputs.region
    : ['ap-guangzhou']

  // chenck state function name
  const stateFunctionName =
    instance.state[regionList[0]] && instance.state[regionList[0]].functionName
  const functionConf = Object.assign(tempFunctionConf, {
    projectJarName: inputs.projectJarName || CONFIGS.projectJarName,
    code: {
      src: inputs.src,
      bucket: inputs.srcOriginal && inputs.srcOriginal.bucket,
      object: inputs.srcOriginal && inputs.srcOriginal.object
    },
    name:
      ensureString(inputs.functionName, { isOptional: true }) ||
      stateFunctionName ||
      getDefaultFunctionName(),
    region: regionList,
    role: ensureString(tempFunctionConf.role ? tempFunctionConf.role : inputs.role, {
      default: ''
    }),
    handler: ensureString(tempFunctionConf.handler ? tempFunctionConf.handler : inputs.handler, {
      default: CONFIGS.handler
    }),
    runtime: ensureString(tempFunctionConf.runtime ? tempFunctionConf.runtime : inputs.runtime, {
      default: CONFIGS.runtime
    }),
    namespace: ensureString(
      tempFunctionConf.namespace ? tempFunctionConf.namespace : inputs.namespace,
      { default: CONFIGS.namespace }
    ),
    description: ensureString(
      tempFunctionConf.description ? tempFunctionConf.description : inputs.description,
      {
        default: CONFIGS.description
      }
    ),
    fromClientRemark,
    cfs: ensureIterable(tempFunctionConf.cfs ? tempFunctionConf.cfs : inputs.cfs, {
      default: []
    }),
    publish: inputs.publish,
    traffic: inputs.traffic,
    lastVersion: instance.state.lastVersion,
    timeout: tempFunctionConf.timeout ? tempFunctionConf.timeout : CONFIGS.timeout,
    memorySize: tempFunctionConf.memorySize ? tempFunctionConf.memorySize : CONFIGS.memorySize,
    tags: ensureObject(tempFunctionConf.tags ? tempFunctionConf.tags : inputs.tag, {
      default: null
    })
  })

  // validate traffic
  if (inputs.traffic !== undefined) {
    validateTraffic(inputs.traffic)
  }
  functionConf.needSetTraffic = inputs.traffic !== undefined && functionConf.lastVersion

  if (tempFunctionConf.environment) {
    functionConf.environment = tempFunctionConf.environment
    functionConf.environment.variables = tempFunctionConf.environment.variables || {}
    functionConf.environment.variables.SERVERLESS = '1'
  } else {
    functionConf.environment = { variables: { SERVERLESS: '1' } }
  }

  if (tempFunctionConf.vpcConfig) {
    functionConf.vpcConfig = tempFunctionConf.vpcConfig
  }

  // 对apigw inputs进行标准化
  const tempApigwConf = inputs.apigatewayConf
    ? inputs.apigatewayConf
    : inputs.apigwConfig
    ? inputs.apigwConfig
    : {}
  const apigatewayConf = Object.assign(tempApigwConf, {
    serviceId: inputs.serviceId || tempApigwConf.serviceId,
    region: regionList,
    isDisabled: tempApigwConf.isDisabled === true,
    fromClientRemark: fromClientRemark,
    serviceName: inputs.serviceName || tempApigwConf.serviceName || getDefaultServiceName(instance),
    serviceDesc: tempApigwConf.serviceDesc || getDefaultServiceDescription(instance),
    protocols: tempApigwConf.protocols || ['http'],
    environment: tempApigwConf.environment ? tempApigwConf.environment : 'release',
    customDomains: tempApigwConf.customDomains || []
  })
  if (!apigatewayConf.endpoints) {
    apigatewayConf.endpoints = [
      {
        path: tempApigwConf.path || '/',
        enableCORS: tempApigwConf.enableCORS,
        serviceTimeout: tempApigwConf.serviceTimeout,
        method: 'ANY',
        apiName: tempApigwConf.apiName || 'index',
        function: {
          isIntegratedResponse: true,
          functionName: functionConf.name,
          functionNamespace: functionConf.namespace,
          functionQualifier:
            (tempApigwConf.function && tempApigwConf.function.functionQualifier) || '$LATEST'
        }
      }
    ]
  }
  if (tempApigwConf.usagePlan) {
    apigatewayConf.endpoints[0].usagePlan = {
      usagePlanId: tempApigwConf.usagePlan.usagePlanId,
      usagePlanName: tempApigwConf.usagePlan.usagePlanName,
      usagePlanDesc: tempApigwConf.usagePlan.usagePlanDesc,
      maxRequestNum: tempApigwConf.usagePlan.maxRequestNum
    }
  }
  if (tempApigwConf.auth) {
    apigatewayConf.endpoints[0].auth = {
      secretName: tempApigwConf.auth.secretName,
      secretIds: tempApigwConf.auth.secretIds
    }
  }

  regionList.forEach((curRegion) => {
    const curRegionConf = inputs[curRegion]
    if (curRegionConf && curRegionConf.functionConf) {
      functionConf[curRegion] = curRegionConf.functionConf
    }
    if (curRegionConf && curRegionConf.apigatewayConf) {
      apigatewayConf[curRegion] = curRegionConf.apigatewayConf
    }
  })

  return {
    regionList,
    functionConf,
    apigatewayConf
  }
}

module.exports = {
  deepClone,
  generateId,
  uploadCodeToCos,
  mergeJson,
  capitalString,
  getDefaultProtocol,
  prepareInputs
}
