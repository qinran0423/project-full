<template>
  <div>
    <h1>用户中心</h1>
    <div ref="drag" id="drag">  
      <input type="file" name="file" @change="handleFilerChange">
    </div>
    <div>
      <p>计算hash的进度</p>
      <el-progress :stroke-width="20" :text-inside="true" :percentage="hashProgress"></el-progress>
    </div>
    <div>
      <el-button @click="uploadFile">上传</el-button>
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
</style>
<script>
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
        uploadProgress: 0,
        hashProgress: 0,
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
            file: this.file.slice(cur, cur*size)
          })
          cur += size
        }

        return chunks
      },
      async calculateHashWorker() {
        return new Promise(resolve => {
          this.worker = new worker('/hash.js')
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
        
      },
      async uploadFile() {
        // if(!await this.isImage(this.file)) {
        //   console.log('图片文件格式不对')
        //   return
        // } 

        this.chunks = this.createFileChunk(this.file)
        const hash = await this.calculateHashWorker()
        console.log('文件hash', hash)
        return
        const form = new FormData()
        form.append('name', 'file')
        form.append('file', this.file)
        const ret = await this.$http.post('/uploadfile', form, {
          onUploadProgress: progress => {
            this.uploadProgress =  Number(((progress.loaded/progress.total) * 100).toFixed(2))
          }
        })
        console.log(ret)
      }
    },
  }
</script>
