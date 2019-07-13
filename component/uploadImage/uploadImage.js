// component/uploadImage/uploadImage.js
// const util = require('../../utils/util.js');
// util 是我司自己封装的 就放不上面了
var app = getApp();
Component({
  /**
   * 组件的属性列表
   */
  properties: {

  },

  /**
   * 组件的初始数据
   */
  data: {
    /*
      每个资源都是一个对象 
      {
        local_url:'', // 本地资源地址
        url:'',// 网络资源地址
        res_type:'', 资源类型 0 视频 1 图片
        upload_state:'',// 上传状态 上传中 upload_start 上传失败 upload_error 上传成功 upload_success 图片删除 upload_delete
        cancel_function:'',// 取消任务函数
        res_index:'', // 资源上传位置
        image_size:'', // 图片宽高
        image_first:'' // 图片是否为第一个
        image_last:'',// 图片是否是最后一个
        image_cover: '', // 是否是封面
      } 
    */
    uploadImageList: [],
    // 添加的资源位置
    resIndex:0,
    videoSuffix: '?vframe/jpg/offset/1', // 视频封面后缀
    // 是否有视频
    isVideo:'',
    // 删除了多少资源
    deleteResNumber:0,
    // 
  },

  /**
   * 组件的方法列表
   */
  methods: {
    
    // created生命周期函数
    created: function () {
 
    },

    // 选择资源
    onClikSelectResources: function(res) {
      let self = this;
      let sourceType;
      switch (res) {
        case 'albumImage':
          console.log("相册选择图片");
          sourceType = ['album'];
          self.addImageResources(sourceType)
          break
        case 'cameraImage':
          console.log("拍摄图片");
          sourceType = ['camera'];
          self.addImageResources(sourceType)
          break
        case 'albumVideo':
          console.log("相册选择视频");
          sourceType = ['album'];
          self.addVideoResources(sourceType);
          break
        case 'cameraVideo':
          console.log("拍摄视频");
          sourceType = ['camera'];
          self.addVideoResources(sourceType);
          break
      }
    },
    

    // 添加图片资源
    addImageResources: function (sourceType) {
      let self = this;
      console.log(self.data.deleteResNumber, self.data.isVideo,self.data.uploadImageList.length)
      // 已上传多少个资源
      let uploadedNumber = self.data.uploadImageList.length - self.data.deleteResNumber;
      // 还可以上传几张
      let maxNumber = self.data.isVideo ? 10 - uploadedNumber : 9 - uploadedNumber;
      if (self.data.isVideo && uploadedNumber >= 10) {
        self.releaseShowModal('只能添加9张')
        return;
      } 
      if (uploadedNumber >= 9) {
        self.releaseShowModal('只能添加9张')
        return;
      } 

      wx.chooseImage({
        count: maxNumber,
        sizeType: ['original'],
        sourceType: sourceType,
        success(imageRes) {
          console.log('选择图片返回信息', imageRes)
          self.data.resIndex = self.data.uploadImageList.length;
          for (let i = 0; i < imageRes.tempFilePaths.length; i++) {
            let imageObj = {
              // 本地资源地址
              local_url: imageRes.tempFilePaths[i],
              // 网络资源地址
              url: '',
              //资源类型 0 视频 1 图片
              res_type: 1, 
              // 上传状态 上传中 upload_start 上传失败 upload_error 上传成功 upload_success 图片删除 upload_delete
              upload_state: 'upload_start',
              // 取消任务函数
              cancel_function: '',
              // 资源上传位置
              res_index: self.data.resIndex + i, 
              // 图片宽高
              image_size: '', 
              // 图片是否为第一个
              image_first: '', 
              // 图片是否是最后一个
              image_last: '',
              // 是否是封面
              image_cover: '',
            }
            self.data.uploadImageList.push(imageObj)
            self.calculatedResOrder();
            // 测量图片 获取图片宽高
            wx.getImageInfo({
              src: imageRes.tempFilePaths[i],
              success: function (res) {
                let imgwidth = res.width
                let imgheight = res.height;
                // 图片宽高需要大于或者等于400
                if (imgwidth >= 400 && imgheight >= 400) {
                  // 记录每张图片的大小
                  self.data.uploadImageList[self.data.resIndex + i].image_size = imgwidth + ',' + imgheight;
                  // 上传七牛
                  self.uploadQiniu(imageRes.tempFilePaths[i], self.data.resIndex + i)
                } else {
                  // 图片不符合规范
                  self.data.uploadImageList[self.data.resIndex + i].upload_state = 'upload_delete';
                  self.calculatedResOrder();
                  wx.showToast({
                    icon: 'none',
                    title: '上传图片太模糊，请重新上传'
                  });
                }
              },
              function(res) {
                // 图片测量失败
                console.log('内容图片测量失败')
                self.data.uploadImageList[self.data.resIndex + i].upload_state = 'upload_delete';
                self.calculatedResOrder();
                wx.showToast({
                  icon: 'none',
                  title: '内容图片测量失败'
                });
              }
            })
          }
        }
      })
    },
    // 上传七牛
    uploadQiniu: function (imagePath, index) {
      let self = this;
      console.log('上传七牛 uploadQiniu', imagePath)
      util.uploadQiniu(
        imagePath,
        0,
        'content_image' + index,
        false,
        false,
        function (imageUrl) {
          // 如果已经取消 但是取消函数需要执行时间 由于上传的太快 依然会走成功回调 但此时状态为删除 则不添加
          if (self.data.uploadImageList[index].upload_state == 'upload_delete') {
            return;
          }
          // 为图片资源url 赋值
          self.data.uploadImageList[index].url = imageUrl + '?imageslim';
          // 更新图片资源状态 为成功
          self.data.uploadImageList[index].upload_state = 'upload_success'
          console.log('图片上传成功 此时资源数组：',self.data.uploadImageList)
          // 上传完毕之后 计算一下当前位置
          self.calculatedResOrder();
        },
        function (res) {
          // 如果已经取消 但是取消函数需要执行时间 由于上传的太快 依然会走失败回调 但此时状态为删除 则不添加
          if (self.data.uploadImageList[index].upload_state == 'upload_delete') {
            return;
          }
          // 更新图片资源状态 为删除
          self.data.uploadImageList[index].upload_state = 'upload_error';
          self.calculatedResOrder();
          wx.showToast({
            icon: 'none',
            title: '上传图片失败，请重新上传'
          });
          console.log('上传图片失败', res)
        },
        function (res) {
          // 如果这张图片已经取消 但是函数还未添加 而正要添加函数 可以直接执行
          if (self.data.uploadImageList[index].upload_state == 'upload_delete') {
            res();
          }
          self.data.uploadImageList[index].cancel_function = res;
        },
      )
    },

    
    // 添加视频
    addVideoResources: function (sourceType) {
      let self= this;
      if (self.data.isVideo) {
        self.releaseShowModal('只能添加一个视频')
        return;
      }
      wx.chooseVideo({
        sourceType: sourceType,
        maxDuration: 60,
        camera: 'back',
        compressed: false,
        success(res) {
          let videoObj = {
            // 封面
            local_url: '',
            // 网络资源地址
            url: '',
            //资源类型 0 视频 1 图片
            res_type: 0,
            // 上传状态 上传中 upload_start 上传失败 upload_error 上传成功 upload_success 图片删除 upload_delete
            upload_state: 'upload_start',
            // 取消任务函数
            cancel_function: '',
            // 资源上传位置
            res_index: 0,
            // 图片宽高
            image_size: '',
            // 图片是否为第一个
            image_first: '',
            // 图片是否是最后一个
            image_last: '',
            // 是否是封面
            image_cover:'',
          }
          self.data.uploadImageList.unshift(videoObj)
          self.calculatedResOrder();
          util.uploadQiniu(res.tempFilePath, 0, 'content_video', false, false,
            function (res) {
              // 如果已经取消 但是取消函数需要执行时间 由于上传的太快 依然会走成功回调 但此时状态为删除 则不添加
              if (self.data.uploadImageList[0].upload_state == 'upload_delete') {
                return;
              }
              self.data.uploadImageList[0].url = res;
              self.data.uploadImageList[0].local_url = res + self.data.videoSuffix;
              self.data.uploadImageList[0].upload_state = 'upload_success'
              console.log('视频上传成功',self.data.uploadImageList)
              // 计算资源顺序
              self.calculatedResOrder();
            },
            function (res) {
              if (self.data.uploadImageList[0].upload_state == 'upload_delete') {
                return;
              }
              self.data.uploadImageList[0].upload_state = 'upload_error';
              // 计算资源顺序
              self.calculatedResOrder();
              wx.showToast({
                icon: 'none',
                title: '视频上传失败'
              });
            },
            function (res) {
              // 如果视频已经取消 但是函数还未添加 而正要添加函数 可以直接执行
              if (self.data.uploadImageList[0].upload_state == 'upload_delete') {
                  res();
              }
              self.data.uploadImageList[0].cancel_function = res;
            },
          )
        }
      })
    },
    // 删除资源
    onClickDeleteRes:function (res) {
      let self = this;
      let index = res.currentTarget.dataset.alphaBeta;
      if (self.data.uploadImageList[index].upload_state == 'upload_start') {
          // 此时删除 但是资源正在上传 那么进行取消
          self.data.uploadImageList[index].cancel_function();
      }
      // 删除视频 那就可以继续上传
      if (!self.data.uploadImageList[index].res_type) {
        self.data.isVideo = false;
      }
      self.data.uploadImageList[index].upload_state = 'upload_delete';
      // 计算图片顺序
      self.calculatedResOrder();
      console.log("删除资源", self.data.uploadImageList);
    },

    // 查看资源
    onCllickLookRes: function (res) {
      let self = this;
      let index = res.currentTarget.dataset.alphaBeta
      console.log("查看资源", index)
      // 查看资源 确保该资源已经上传成功 
      if (self.data.uploadImageList[index].upload_state == 'upload_success') {
        if (!self.data.uploadImageList[index].res_type) {
          wx.navigateTo({
            url: '../video/video?url=' + self.data.uploadImageList[index].url,
          })
          return;
        } else {
          let newImgList = [];
          // 遍历资源数组 
          for (let i = 0; i < self.data.uploadImageList.length; i++) {
            // 此资源 是图片 并且上传成功
            if (self.data.uploadImageList[i].upload_state == 'upload_success' && self.data.uploadImageList[i].res_type) {
              newImgList.push(self.data.uploadImageList[i].url)
            }
          }
          wx.previewImage({
            current: self.data.uploadImageList[index].url,
            urls: newImgList // 需要预览的图片http链接列表
          })
        }
      }

    },
    /*
      找出第一张图片
      找出第最后一张图片
      是否有视频 有视频 则不能再次上传 无视频可以上传
      计算 还可以上传几个资源
      最多 可以上传9张图片 一个视频
    */
    calculatedResOrder:function () {
      let self = this;
      // 正序遍历一遍 
      for (let i = 0;i<self.data.uploadImageList.length;i++) {
        // 找出第一个 资源 然后终止循环 第一个也有可能是错误的
        if (self.data.uploadImageList[i].upload_state != 'upload_delete') {
            self.data.uploadImageList[i].image_first = true;
            break;
          }
      }
      // 正序遍历一遍 
      for (let i = 0; i < self.data.uploadImageList.length; i++) {
        // 找出是第一张 不是错误的 也没有被删除资源
        if (self.data.uploadImageList[i].res_type && self.data.uploadImageList[i].upload_state != 'upload_delete' && self.data.uploadImageList[i].upload_state != 'upload_error') {
          self.data.uploadImageList[i].image_cover = true;
          break;
        }
      }
      // 计算删除了多少资源
      let deleteResNumber  = 0;
      // 是否有视频
      // 正序遍历一遍 
      for (let i = 0; i < self.data.uploadImageList.length; i++) {
        // 找出没有被删除
        if (!self.data.uploadImageList[i].res_type && self.data.uploadImageList[i].upload_state !='upload_delete') {
          self.data.isVideo = true;
        }
        // 计算删除了多少资源 
        if (self.data.uploadImageList[i].upload_state == 'upload_delete') {
          deleteResNumber++;
        }
      }
      // 找出最后一张有效资源
      for (var i = self.data.uploadImageList.length - 1; i >= 0; i--) {
        if (self.data.uploadImageList[i].upload_state != 'upload_delete') {
          self.data.uploadImageList[i].image_last = true;
          break
        }
      }
      self.setData({
        deleteResNumber: deleteResNumber,
        uploadImageList: self.data.uploadImageList,
      })
      console.log('更新布局UI',self.data.uploadImageList)
    },


    // 初始化UI
    initUoladImgaeList:function (resList,video) {
      let self = this;
      for (let i = 0;i<resList.length;i++) {
        let imageObj = {
          // 封面
          local_url: '',
          // 网络资源地址
          url: resList[i],
          //资源类型 0 视频 1 图片
          res_type: 1,
          // 上传状态 上传中 upload_start 上传失败 upload_error 上传成功 upload_success 图片删除 upload_delete
          upload_state: 'upload_success',
          // 取消任务函数
          cancel_function: '',
          // 资源上传位置
          res_index: i,
          // 图片宽高
          image_size: '',
          // 图片是否为第一个
          image_first:'',
          // 图片是否是最后一个
          image_last: '',
          // 是否是封面
          image_cover: '',
        }
        self.data.uploadImageList.push(imageObj)
        self.celiangImagheSize(video ? i+1 : i, resList[i])
      }
      if (video) {
        let vidoeObj = {
          local_url: video + self.data.videoSuffix,
          url: video,
          res_type: 0,
          upload_state: 'upload_success',
          cancel_function: '',
          res_index: 0,
          image_size: '',
          image_first: '',
          image_last: '',
          image_cover: '',
        }
        self.data.uploadImageList.unshift(vidoeObj)
      }
      // 清空数据
      if (resList.length==0) {
        self.data.uploadImageList = resList;
      }
      self.calculatedResOrder();

    },

    // 发布失败提示
    releaseShowModal: function (str) {
      wx.showModal({
        title: '提示',
        content: str,
        showCancel: false
      })
    },

    celiangImagheSize:function (index,filePaths) {
      let self = this;
      // 测量图片 获取图片宽高
      wx.getImageInfo({
        src: filePaths,
        success: function (res) {
          let imgwidth = res.width
          let imgheight = res.height;
          // 记录每张图片的大小
          console.log('记录每张图片的大小',imgwidth + ',' + imgheight)
          self.data.uploadImageList[index].image_size = imgwidth + ',' + imgheight;
        },
        function(res) {
          // 图片测量失败
          self.data.uploadImageList[index].image_size = 400 + ',' + 400;
        }
      })
    }
  }
})