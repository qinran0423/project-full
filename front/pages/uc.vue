<template>
  <div>
    <h1>用户中心</h1>
    <div ref="drag" id="drag">  
      <input type="file" name="file" @change="handleFilerChange">
    </div>
    <div>
      <p>计算hash的进度</p>
      <!-- <el-progress :stroke-width="20" :text-inside="true" :percentage="uploadProgress"></el-progress> -->
    </div>
    <div>
      <el-button @click="uploadFile">上传</el-button>
    </div>
    <div>
      <el-progress :stroke-width="20" :text-inside="true" :percentage="hashProgress"></el-progress>
    </div>
    <!-- chunk.progress  
      progress < 0 报错 显示红色
       = 100 成功
       别的数字 方块高度显示
     -->
    <div class="cube-container" :style="{width: cubeWidth + 'px'}">
      <div class="cube" v-for="chunk in chunks" :key="chunk.name">
        <div 
          :class="{
            'uploading': chunk.progress > 0 && chunk.progress < 100,
            'success': chunk.progress == 100,
            'error': chunk.progress < 0
          }"
        >
          <i class="el-icon-loading"  style="color: #f56c6c" v-if="chunk.progress < 100 && chunk.progress> 0"></i>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss">
  #drag{
    height: 100px;
    line-height: 100px;
    border: 2px dashed #eeeeee;
    text-align: center;
  }
  .cube-container{
    .cube{
      width: 14px;
      height: 14px;
      line-height: 12px;
      border: 1px solid #000;
      background: #eeeeee;
      float: left;
      >.success {
        background: #67C23A;
      }
      >.uploading{
        background: #409EFF;
      }
      >.error{
         background: #F56C6C;
      }
    }
  }
</style>
<script>
import sparkMD5 from 'spark-md5'
const CHUNKS_SIZE = 0.5*1024*1024
  export default {
    async mounted() {
      const ret = await this.$http.get('/user/info')
      console.log(ret)
      this.bindEvents()
    },
    data() {
      return {
        file:null,
        // uploadProgress: 0,
        hashProgress: 0,
        chunks: []
      }
    },
    computed: {
      cubeWidth() {
        return Math.ceil(Math.sqrt(this.chunks.length)) * 16
      },
      uploadProgress() {
        if(!this.file || this.chunks.length) {
          return 0
        }
        const loaded = this.chunks.map(item => item.chunk.size * item.progress)
                            .reduce((acc, cur) => acc + cur, 0)
        return parseInt(((loaded*100)/this.file.size).toFixed(2))
      }
    },
    methods: {
      bindEvents() {
        const drag = this.$refs.drag
        drag.addEventListener('dragover', e => {
          drag.style.borderColor = 'red'
          e.preventDefault();
        })
        drag.addEventListener('dragleave', e => {
          drag.style.borderColor = '#eee'
          e.preventDefault();
        })
        drag.addEventListener('drop', e => {
          const fileList = e.dataTransfer.files
          drag.style.borderColor = '#eee'
          this.file = fileList[0]
          e.preventDefault();
        })
      },
      async blboToString(blob) {
        return new Promise(resolve => {
          const reader = new FileReader()
          reader.onload = function() {
            console.log(reader.result)
            const ret = reader.result.split('')
                          .map(v => v.charCodeAt())
                          .map(v => v.toString(16).toUpperCase())
                          .join(' ')
            resolve(ret)
          }
          reader.readAsBinaryString(blob)
        })
      },
      async isGif(file) {
        // GIF89a  GIF87a
        // 前面6个16进制， ‘47 49 46 38 39 61’ ‘47 49 46 38 37 61’
        // 16进制的转换
        const ret = await this.blboToString(file.slice(0,6))
        console.log(ret)
        const isGif = (ret == '47 49 46 38 39 61') || (ret == '47 49 46 38 37 61')
        console.log('isGif', isGif)
        return isGif
      },
      async isImage(file) {
        // 通过文件流来判定
        // 先判定是不是gif
        return await this.isGif(file) || await this.isPng(file)
     
      },
      async isPng(file) {
        const ret = await this.blboToString(file.slice(0,8))
        // '89 50 4E 47 0D 0A 1A 0A'
        const ispng = (ret == '89 50 4E 47 0D 0A 1A 0A' )
        return ispng
      },

      async isJpg(file) {
        const len = file.size
        const start = await this.blboToString(file.slice(0,2))
        const end = await this.blboToString(file.slice(-1,len))
        // '89 50 4E 47 0D 0A 1A 0A'
        const isjpg = (start == 'FF D8') && (end == 'FF D9')
        return isjpg
      },
      handleFilerChange(e) {
        
        const [file] = e.target.files
        if(!file) return
        this.file = file
      },
      createFileChunk(file, size = CHUNKS_SIZE) {
        const chunks = []
        let cur = 0
        while(cur < this.file.size) {
          chunks.push({
            index: cur,
            file: this.file.slice(cur, cur + size)
          })
          cur += size
        }
        return chunks
      },
      async calculateHashWorker() {
        return new Promise(resolve => {
          this.worker = new Worker('/hash.js')
          this.worker.postMessage({chunks: this.chunks})
          this.worker.onmessage = e => {
            const {progress, hash} = e.data
            this.hashProgress = Number(progress.toFixed(2))
            if(hash) {
              resolve(hash)
            }
          }
        })
      },
      async calculateHashIdle() {
        const chunks = this.chunks
        return new Promise(resolve => {
          const spark = new sparkMD5.ArrayBuffer()
          let count = 0
          const appendToSpark = async file => {
            return new Promise(resolve => {
              const reader = new FileReader()
              reader.readAsArrayBuffer(file)
              reader.onload = e => {
                spark.append(e.target.result) 
                resolve()
              }
            })
          }
          const workLoop = async deadline =>{
            while(count < chunks.length && deadline.timeRemaining() > 1) {
              // 空闲时间，且有任务
              await appendToSpark(chunks[count].file)
              count ++
              if(count < chunks.length) {
                this.hashProgress = Number(
                ((100*count)/chunks.length).toFixed(2)
                )
              } else{
                this.hashProgress = 100
                resolve(spark.end())
              }
            }

            window.requestIdleCallback(workLoop)
          }
          window.requestIdleCallback(workLoop)
        })
      },

      async calculdateHashSample() {
        return new Promise(resolve => {
          const spark = new sparkMD5.ArrayBuffer()
          const reader = new FileReader()

          const file = this.file
          const size = file.size
          const offset = 2*1024*1024

          // 第一个2M，最后一个区块数据全要
          let chunks = [file.slice(0,offset)]

          let cur = offset
          while(cur<size) {
            if(cur+offset >= size){
              // 最后一个区块
              chunks.push(file.slice(cur, cur+offset))
            } else {
              // 中间的区块
              const mid = cur + offset /2
              const end = cur + offset
              chunks.push(file.slice(cur, cur+2))
              chunks.push(file.slice(mid, cur+2))
              chunks.push(file.slice(end-2, end))
            }
            cur += offset
          }
          // 中间的，取前中后各2个字节
          reader.readAsArrayBuffer(new Blob(chunks))
          reader.onload = e => {
            spark.append(e.target.result)
            this.hashProgress = 100
            resolve(spark.end())
          }


        })
      },
      async uploadFile() {
        // if(!await this.isImage(this.file)) {
        //   console.log('图片文件格式不对')
        //   return
        // } 

        const chunks = this.createFileChunk(this.file)
        // const hash = await this.calculateHashWorker()
        // const hash1 = await this.calculateHashIdle()
        // console.log('文件hash', hash)
        // console.log('文件hash1', hash1);
        const hash = await this.calculdateHashSample()
        this.hash = hash
        // console.log('文件hash2', hash2);
        // 抽样hash 不算全量  
        // 布隆过滤器

        this.chunks = chunks.map((chunk, index) =>{
          // 文件切片的名字 hash + index
          const name =  this.hash + '-' + index
          return {
            hash,
            name,
            index,
            chunk: chunk.file
          }
        })

        await this.uploadChunks()

       
      },
      async uploadChunks() {
        const requests = this.chunks.map((chunk, index) => {
          // 转换promise
          const form = new FormData()
          form.append('chunk', chunk.chunk)
          form.append('chunk', chunk.hash)
          form.append('chunk', chunk.name)
          // form.append('chunk', chunk.index)
          return {form}
        }).map((form, index) => this.$http.post('/uploadfile', {
          onUploadProgress: progress => {
            // 不是整体的进度条，而是每个区块都有自己的进度条，整体的进度条需要计算
            this.chunks[index].progress = Number(((progress.loaded/progress.total) * 100).toFixed(2))
          }
        }))
        // @todo 并发量控制
        await Promise.all(requests)
        // const form = new FormData()
        // form.append('name', 'file')
        // form.append('file', this.file)
        // const ret = await this.$http.post('/uploadfile', form, {
        //   onUploadProgress: progress => {
        //     this.uploadProgress =  Number(((progress.loaded/progress.total) * 100).toFixed(2))
        //   }
        // })
        // console.log(ret)
      }
    },
  }
</script>
