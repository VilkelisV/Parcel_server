import mongoose from "mongoose";
import IRegistration from "../interfaces/IRegistration";
import HttpException from "../middleware/http.exception";
import IUser from "../interfaces/IUser";
import Users from "../models/user.model";
import Posts from "../models/post.model";
import Reviews from "../models/review.model";
import bcrypt from "bcrypt";
import { hashPassword } from "../middleware/utils";
import { postsRouter } from "../routes/posts.routes";
import { mailer, sendEmail } from "./mailer";
import IReview from "../interfaces/IReview";
import { deletePost, getAllPosts } from "./post.controller";

async function getAllUsers() {
  return await Users.find({})
    .then((result) => {
      if (!result) {
        throw new HttpException(404, "No result");
      }
      return result;
    })
    .catch(() => {
      throw new HttpException(404, "No results");
    });
}

async function getOneUser(id: string) {
  return await Users.findById(id)
    .then((result) => {
      if (!result) {
        throw new HttpException(404, "No result");
      }
      return result;
    })
    .catch(() => {
      throw new HttpException(404, "No such user");
    });
}

async function createUser(user: any) {
  return await checkIfEmailTaken(user.email)
    .then(async (response) => {
      if (!response) {
        const password = await hashPassword(user.password);
        const newUser = {
          email: user.email,
          password: password,
          firstName: user.firstName,
          lastName: user.lastName,
          registrationTime: Date.now(),
          phone: user.phone,
          rating: 0,
          tripCount: 0,
          sentCount: 0,
          posts: [],
          review: [],
          isAdmin: false,
          googleId: user.googleId,
        };
        return await Users.create(newUser)
          .then(() => {
            return "User created successfully!";
          })
          .catch((error) => {
            throw new Error(error);
          });
      } else {
        throw new HttpException(400, "Email is already taken");
      }
    })
    .catch((error) => {
      console.log(error);
      throw new HttpException(error.status, error.message);
    });
}

async function getAllUserReviews(userId: string) {
  return await Reviews.find({ targetId: userId }).then((result) => {
    return result;
  });
}

async function getOneReview(id: string) {
  return await Reviews.findById(id)
    .then((result) => {
      if (!result) {
        throw new HttpException(404, "No review");
      }
      return result;
    })
    .catch(() => {
      throw new HttpException(404, "No such user");
    });
}

async function addReview(review: IReview) {
  return await Reviews.create(review)
    .then(async (result: any) => {
      await assignReviewToUser(result._id, result.targetId)
        .then((ret) => {
          return "Review added successfully!";
        })
        .catch((error) => {
          throw new HttpException(500, error);
        });
    })
    .catch((error) => {
      console.log(error);
      throw new HttpException(404, "No such user");
    });
}

async function checkIfEmailTaken(email: string) {
  return await Users.findOne({ email: email }).then((user) => {
    return user != null ? true : false;
  });
}

async function updateUser(id: string, user: IUser) {
  console.log(user);
  return await Users.findOneAndUpdate(
    { _id: id },
    { firstName: user.firstName },
    { new: true }
  )
    .then((newUser) => {
      console.log(newUser);
      return "User updated successfully!";
    })
    .catch(() => {
      throw new HttpException(404, "No such user");
    });
}

async function increaseTripCount(id: string) {
  return await Users.findOneAndUpdate(
    { _id: id },
    { $inc: { tripCount: 1 } },
    { new: true }
  ).then((response) => {
    return response;
  });
}

async function increaseSentCount(id: string) {
  return await Users.findOneAndUpdate(
    { _id: id },
    { $inc: { sentCount: 1 } },
    { new: true }
  ).then((response) => {
    return response;
  });
}

async function assignReviewToUser(reviewId: string, targetId: string) {
  await Users.findOneAndUpdate(
    { _id: targetId },
    { $push: { reviews: reviewId } }
  )
    .then(async () => {
      await Users.findOneAndUpdate(
        { _id: targetId },
        { $inc: { reviewCount: 1 } }
      ).then(() => {
        return "Review assigned to the user";
      });
    })
    .catch(() => {
      throw new HttpException(404, "No such user");
    });
}

async function assignPostToUser(authorId: string, postId: string) {
  await Users.findOneAndUpdate({ _id: authorId }, { $push: { posts: postId } })
    .then(() => {
      return "Post assigned to the user";
    })
    .catch(() => {
      throw new HttpException(404, "No such user");
    });
}

async function deleteUser(id: string) {
  return await Users.findOneAndRemove({ _id: id })
    .then(async () => {
      console.log("user deleted");
      await getAllPosts().then(async (result: any) => {
        result.forEach(async (post) => {
          if (post.author.id == id) {
            await deletePost(post._id);
          }
        });
        return "User deleted successfully!";
      });
    })
    .catch(() => {
      throw new HttpException(404, "No such user");
    });
}

async function sendContactInfo(post: any, email: any) {
  await getOneUser(post.author.id).then((user: any) => {
    sendEmail({
      from: "noreply@siunt.io",
      to: "mantasereicikas@gmail.com",
      subject: `Kelionės ${post.cityStart} - ${post.cityEnd} informacija`,
      html: `
      <p>Sveiki, \n siunčiame įrašo autoriaus kontaktinius duomenis</p>
      <h4>Vartotojo kontaktiniai duomenys: </h4>
      <p><b>Vardas: </b>: ${user.firstName}</p>
      <p><b>el. paštas</b>: ${user.email}</p>
      <p><b>telefono numeris:</b> ${user.phone}</p>`,
    })
      .then(() => {
        console.log("Sekmingai issiusta");
        return true;
      })
      .catch((error) => {
        return error;
      });
  });
}

export {
  getAllUsers,
  getOneUser,
  createUser,
  updateUser,
  getAllUserReviews,
  assignPostToUser,
  deleteUser,
  increaseTripCount,
  addReview,
  increaseSentCount,
  sendContactInfo,
};
