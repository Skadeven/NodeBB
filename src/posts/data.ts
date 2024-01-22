'use strict';

import db from '../database';
import plugins from '../plugins';
import utils from '../utils';

const intFields:string[] = [
    'uid', 'pid', 'tid', 'deleted', 'timestamp',
    'upvotes', 'downvotes', 'deleterUid', 'edited',
    'replies', 'bookmarks',
];

module.exports = function (Posts:any) {
    Posts.getPostsFields = async function (pids:number[], fields:string[]): any[]{
        if (!Array.isArray(pids) || !pids.length) {
            return [];
        }
        const keys: string[] = pids.map(pid => `post:${pid}`);
        const postData: any[] = await db.getObjects(keys, fields);
        const result: any = await plugins.hooks.fire('filter:post.getFields', {
            pids: pids,
            posts: postData,
            fields: fields,
        });
        result.posts.forEach((post:any) => modifyPost(post, fields));
        return result.posts;
    };

    Posts.getPostData = async function (pid): any | null {
        const posts: any[] = await Posts.getPostsFields([pid], []);
        return posts && posts.length ? posts[0] : null;
    };

    Posts.getPostsData = async function (pids:number[]): any[] {
        return await Posts.getPostsFields(pids, []);
    };

    Posts.getPostField = async function (pid: number, field: string): any {
        const post:any = await Posts.getPostFields(pid, [field]);
        return post ? post[field] : null;
    };

    Posts.getPostFields = async function (pid: number, fields: string[]): any | null {
        const posts: any[] = await Posts.getPostsFields([pid], fields);
        return posts ? posts[0] : null;
    };

    Posts.setPostField = async function (pid: number, field: string, value: any):void {
        await Posts.setPostFields(pid, { [field]: value });
    };

    Posts.setPostFields = async function (pid: number, data: any): void {
        await db.setObject(`post:${pid}`, data);
        plugins.hooks.fire('action:post.setFields', { data: { ...data, pid } });
    };
};

function modifyPost(post: any, fields: string[]) {
    if (post) {
        db.parseIntFields(post, intFields, fields);
        if (post.hasOwnProperty('upvotes') && post.hasOwnProperty('downvotes')) {
            post.votes = post.upvotes - post.downvotes;
        }
        if (post.hasOwnProperty('timestamp')) {
            post.timestampISO = utils.toISOString(post.timestamp);
        }
        if (post.hasOwnProperty('edited')) {
            post.editedISO = post.edited !== 0 ? utils.toISOString(post.edited) : '';
        }
    }
}