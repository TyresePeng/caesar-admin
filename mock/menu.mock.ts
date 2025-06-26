import { defineMock } from "./base";

export default defineMock([
  {
    url: "menus/routes",
    method: ["GET"],
    body: {
      code: "00000",
      data: [
        {
          path: "/system",
          component: "Layout",
          redirect: "/system/user",
          name: "/system",
          meta: {
            title: "系统管理",
            icon: "system",
            hidden: false,
            alwaysShow: false,
            params: null,
          },
          children: [
            {
              path: "user",
              component: "system/user/index",
              name: "User",
              meta: {
                title: "用户管理",
                icon: "user",
                hidden: false,
                keepAlive: true,
                alwaysShow: false,
                params: null,
              },
            },
          ],
        },
        {
          path: "/help",
          component: "Layout",
          redirect: "/help/platform-manager",
          name: "/help",
          meta: {
            title: "帮助中心",
            icon: "help",
            hidden: false,
            alwaysShow: false,
            params: null,
          },
          children: [
            {
              path: "file-manager",
              component: "help/file-manager/index",
              name: "fileManager",
              meta: {
                title: "文件操作",
                icon: "manager",
                hidden: false,
                keepAlive: true,
                alwaysShow: false,
                params: null,
              },
            },
            {
              path: "java-code-manager",
              component: "help/java-code-manager/index",
              name: "javaCodeManager",
              meta: {
                title: "代码生成",
                icon: "manager",
                hidden: false,
                keepAlive: true,
                alwaysShow: false,
                params: null,
              },
            },
          ],
        },

        {
          path: "/crawler",
          component: "Layout",
          redirect: "/crawler",
          name: "/crawler",
          meta: {
            title: "爬虫管理",
            icon: "help",
            hidden: false,
            alwaysShow: false,
            params: null,
          },
          children: [
            {
              path: "krea",
              component: "crawler/krea/index",
              name: "krea",
              meta: {
                title: "krea管理",
                icon: "manager",
                hidden: false,
                keepAlive: true,
                alwaysShow: false,
                params: null,
              },
            },
            {
              path: "douyin",
              component: "crawler/douyin/index",
              name: "douyin",
              meta: {
                title: "DouYin",
                icon: "manager",
                hidden: false,
                keepAlive: true,
                alwaysShow: false,
                params: null,
              },
            },
          ],
        },
      ],
      msg: "一切ok",
    },
  },

  {
    url: "menus",
    method: ["GET"],
    body: {
      code: "00000",
      data: [
        {
          id: 1,
          parentId: 0,
          name: "系统管理",
          type: "CATALOG",
          routeName: "",
          routePath: "/system",
          component: "Layout",
          sort: 1,
          visible: 1,
          icon: "system",
          redirect: "/system/user",
          perm: null,
          children: [
            {
              id: 2,
              parentId: 1,
              name: "用户管理",
              type: "MENU",
              routeName: "User",
              routePath: "user",
              component: "system/user/index",
              sort: 1,
              visible: 1,
              icon: "user",
              redirect: null,
              perm: null,
              children: [
                {
                  id: 105,
                  parentId: 2,
                  name: "用户查询",
                  type: "BUTTON",
                  routeName: null,
                  routePath: "",
                  component: null,
                  sort: 0,
                  visible: 1,
                  icon: "",
                  redirect: null,
                  perm: "sys:user:query",
                  children: [],
                },
              ],
            },
          ],
        },
        {
          id: 3,
          parentId: 0,
          name: "帮助中心",
          type: "CATALOG",
          routeName: "",
          routePath: "/help",
          component: "Layout",
          sort: 2,
          visible: 1,
          icon: "help",
          redirect: "/help/platform-manager",
          perm: null,
          children: [
            {
              id: 4,
              parentId: 3,
              name: "管理帮助",
              type: "MENU",
              routeName: "PlatformManager",
              routePath: "manager/index",
              component: "help/platform-manager/index",
              sort: 1,
              visible: 1,
              icon: "manager",
              redirect: null,
              perm: null,
              children: [],
            },
          ],
        },
        {
          id: 5,
          parentId: 0,
          name: "爬虫管理",
          type: "CATALOG",
          routeName: "",
          routePath: "/crawler",
          component: "Layout",
          sort: 2,
          visible: 1,
          icon: "help",
          redirect: "/crawler",
          perm: null,
        },
      ],
      msg: "一切ok",
    },
  },

  {
    url: "menus/options",
    method: ["GET"],
    body: {
      code: "00000",
      data: [
        {
          value: 1,
          label: "系统管理",
          children: [
            {
              value: 2,
              label: "用户管理",
              children: [
                {
                  value: 105,
                  label: "用户查询",
                },
                {
                  value: 31,
                  label: "用户新增",
                },
                {
                  value: 32,
                  label: "用户编辑",
                },
                {
                  value: 33,
                  label: "用户删除",
                },
                {
                  value: 88,
                  label: "重置密码",
                },
                {
                  value: 106,
                  label: "用户导入",
                },
                {
                  value: 107,
                  label: "用户导出",
                },
              ],
            },
          ],
        },
        {
          value: 3,
          label: "帮助中心",
          children: [
            {
              value: 4,
              label: "管理帮助",
            },
          ],
        },
      ],
      msg: "一切ok",
    },
  },

  // 新增菜单
  {
    url: "menus",
    method: ["POST"],
    body({ body }) {
      return {
        code: "00000",
        data: null,
        msg: "新增菜单" + body.name + "成功",
      };
    },
  },

  // 获取菜单表单数据
  {
    url: "menus/:id/form",
    method: ["GET"],
    body: ({ params }) => {
      return {
        code: "00000",
        data: menuMap[params.id],
        msg: "一切ok",
      };
    },
  },

  // 修改菜单
  {
    url: "menus/:id",
    method: ["PUT"],
    body({ body }) {
      return {
        code: "00000",
        data: null,
        msg: "修改菜单" + body.name + "成功",
      };
    },
  },

  // 删除菜单
  {
    url: "menus/:id",
    method: ["DELETE"],
    body({ params }) {
      return {
        code: "00000",
        data: null,
        msg: "删除菜单" + params.id + "成功",
      };
    },
  },
]);

// 菜单映射表数据
const menuMap: Record<string, any> = {
  1: {
    id: 1,
    parentId: 0,
    name: "系统管理",
    type: "CATALOG",
    routeName: "",
    routePath: "/system",
    component: "Layout",
    perm: null,
    visible: 1,
    sort: 1,
    icon: "system",
    redirect: "/system/user",
    keepAlive: null,
    alwaysShow: null,
    params: null,
  },
  3: {
    id: 3,
    parentId: 0,
    name: "帮助中心",
    type: "CATALOG",
    routeName: "",
    routePath: "/help",
    component: "Layout",
    perm: null,
    visible: 1,
    sort: 2,
    icon: "help",
    redirect: "/help/platform-manager/index",
    keepAlive: null,
    alwaysShow: null,
    params: null,
  },
};
