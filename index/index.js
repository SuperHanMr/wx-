const app = getApp()
var self;
Page({
  data: {
    navigationHeight:60,
  },
  onLoad: function () {
    self = this;
  },


  // 添加资源
  onClikAddResources: function (res) {
    switch (res.currentTarget.id) {
      case 'image':
        self.data.typeRes = 0;
        break
      case 'video':
        self.data.typeRes = 1;
        break
    }
    self.setData({
      showDialog: true,
      typeRes: self.data.typeRes
    })
  },

  // 相册选择照片
  onClikSelectResources: function (res) {
    self.selectComponent('.uploadImage').onClikSelectResources(res.currentTarget.id)
    // self.selectComponent('.uploadImage').data.uploadImageList 这种方式可以获取 组件里面的数据
    self.setData({
      showDialog: false
    })
  },
  onClickCancle:function () {
    self.setData({
      showDialog: false
    })
  }
})
